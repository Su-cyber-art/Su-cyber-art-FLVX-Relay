import type {
  MonitorNodeApiItem,
  MonitorTunnelApiItem,
  NodeMetricApiItem,
  ServiceMonitorApiItem,
  ServiceMonitorLimitsApiData,
  ServiceMonitorMutationPayload,
  ServiceMonitorResultApiItem,
  TunnelMetricApiItem,
} from "@/api/types";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Activity, Play, Plus, RefreshCw, Server, Trash2, Waypoints } from "lucide-react";

import {
  createServiceMonitor,
  deleteServiceMonitor,
  getMonitorAccess,
  getMonitorNodes,
  getMonitorTunnels,
  getNodeMetrics,
  getServiceMonitorLatestResults,
  getServiceMonitorLimits,
  getServiceMonitorList,
  getTunnelMetrics,
  runServiceMonitor,
  updateServiceMonitor,
} from "@/api";
import { AnimatedPage } from "@/components/animated-page";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/page-state";
import { Button } from "@/shadcn-bridge/heroui/button";
import { Card, CardBody, CardHeader } from "@/shadcn-bridge/heroui/card";
import { Chip } from "@/shadcn-bridge/heroui/chip";
import { Input } from "@/shadcn-bridge/heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/shadcn-bridge/heroui/modal";
import { Select, SelectItem } from "@/shadcn-bridge/heroui/select";
import { Switch } from "@/shadcn-bridge/heroui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@/shadcn-bridge/heroui/table";

const RANGE_OPTIONS = [
  { label: "15分钟", value: 15 * 60 * 1000 },
  { label: "1小时", value: 60 * 60 * 1000 },
  { label: "6小时", value: 6 * 60 * 60 * 1000 },
  { label: "24小时", value: 24 * 60 * 60 * 1000 },
];

const DEFAULT_LIMITS: ServiceMonitorLimitsApiData = {
  checkerScanIntervalSec: 30,
  workerLimit: 5,
  minIntervalSec: 30,
  defaultIntervalSec: 60,
  minTimeoutSec: 1,
  defaultTimeoutSec: 5,
  maxTimeoutSec: 60,
};

const formatTimestamp = (ts: number, rangeMs: number): string => {
  const date = new Date(ts);
  const includeDate = rangeMs >= 24 * 60 * 60 * 1000;

  return includeDate
    ? date.toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
};

const formatDateTime = (ts: number): string => {
  return new Date(ts).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const base = 1024;
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(base)));
  return `${(bytes / Math.pow(base, idx)).toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
};

const metricTickFormatter = (value: unknown): string => {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(0)}%` : "";
};

const bytesTickFormatter = (value: unknown): string => {
  const n = Number(value);
  return Number.isFinite(n) ? formatBytes(n) : "";
};

const successLabel = (result: ServiceMonitorResultApiItem | null): string => {
  if (!result) return "未检查";
  return result.success === 1 ? "成功" : "失败";
};

export default function MonitorPage() {
  const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null);
  const [accessMessage, setAccessMessage] = useState("");

  const [nodes, setNodes] = useState<MonitorNodeApiItem[]>([]);
  const [nodesLoading, setNodesLoading] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [nodeMetrics, setNodeMetrics] = useState<NodeMetricApiItem[]>([]);
  const [nodeMetricsLoading, setNodeMetricsLoading] = useState(false);
  const [nodeMetricsError, setNodeMetricsError] = useState("");

  const [tunnels, setTunnels] = useState<MonitorTunnelApiItem[]>([]);
  const [tunnelsLoading, setTunnelsLoading] = useState(false);
  const [selectedTunnelId, setSelectedTunnelId] = useState<number | null>(null);
  const [tunnelMetrics, setTunnelMetrics] = useState<TunnelMetricApiItem[]>([]);
  const [tunnelMetricsLoading, setTunnelMetricsLoading] = useState(false);
  const [tunnelMetricsError, setTunnelMetricsError] = useState("");

  const [serviceMonitors, setServiceMonitors] = useState<ServiceMonitorApiItem[]>([]);
  const [serviceMonitorsLoading, setServiceMonitorsLoading] = useState(false);
  const [serviceMonitorsError, setServiceMonitorsError] = useState("");
  const [latestResults, setLatestResults] = useState<Record<number, ServiceMonitorResultApiItem>>({});
  const [limits, setLimits] = useState<ServiceMonitorLimitsApiData>(DEFAULT_LIMITS);

  const [rangeMs, setRangeMs] = useState(60 * 60 * 1000);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<ServiceMonitorApiItem | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form, setForm] = useState<ServiceMonitorMutationPayload>({
    name: "",
    type: "tcp",
    target: "",
    intervalSec: DEFAULT_LIMITS.defaultIntervalSec,
    timeoutSec: DEFAULT_LIMITS.defaultTimeoutSec,
    nodeId: 0,
    enabled: 1,
  });

  const loadAccess = useCallback(async () => {
    const response = await getMonitorAccess();
    if (response.code === 0 && response.data) {
      setAccessAllowed(Boolean(response.data.allowed));
      setAccessMessage(response.data.allowed ? "" : "暂无监控权限，请联系管理员授权");
      return response.data.allowed;
    }
    setAccessAllowed(false);
    setAccessMessage(response.msg || "无法加载监控权限");
    return false;
  }, []);

  const loadNodes = useCallback(async () => {
    setNodesLoading(true);
    try {
      const response = await getMonitorNodes();
      if (response.code === 0 && Array.isArray(response.data)) {
        setNodes(response.data);
        return;
      }
      toast.error(response.msg || "加载节点失败");
    } catch {
      toast.error("加载节点失败");
    } finally {
      setNodesLoading(false);
    }
  }, []);

  const loadTunnels = useCallback(async () => {
    setTunnelsLoading(true);
    try {
      const response = await getMonitorTunnels();
      if (response.code === 0 && Array.isArray(response.data)) {
        setTunnels(response.data);
        return;
      }
      toast.error(response.msg || "加载隧道失败");
    } catch {
      toast.error("加载隧道失败");
    } finally {
      setTunnelsLoading(false);
    }
  }, []);

  const loadNodeMetrics = useCallback(async (nodeId: number) => {
    setNodeMetricsLoading(true);
    setNodeMetricsError("");
    try {
      const end = Date.now();
      const start = end - rangeMs;
      const response = await getNodeMetrics(nodeId, start, end);
      if (response.code === 0 && Array.isArray(response.data)) {
        setNodeMetrics([...response.data].sort((a, b) => a.timestamp - b.timestamp));
        return;
      }
      setNodeMetricsError(response.msg || "加载节点指标失败");
    } catch {
      setNodeMetricsError("加载节点指标失败");
    } finally {
      setNodeMetricsLoading(false);
    }
  }, [rangeMs]);

  const loadTunnelMetrics = useCallback(async (tunnelId: number) => {
    setTunnelMetricsLoading(true);
    setTunnelMetricsError("");
    try {
      const end = Date.now();
      const start = end - rangeMs;
      const response = await getTunnelMetrics(tunnelId, start, end);
      if (response.code === 0 && Array.isArray(response.data)) {
        setTunnelMetrics([...response.data].sort((a, b) => a.timestamp - b.timestamp));
        return;
      }
      setTunnelMetricsError(response.msg || "加载隧道指标失败");
    } catch {
      setTunnelMetricsError("加载隧道指标失败");
    } finally {
      setTunnelMetricsLoading(false);
    }
  }, [rangeMs]);

  const loadServiceMonitors = useCallback(async () => {
    setServiceMonitorsLoading(true);
    setServiceMonitorsError("");
    try {
      const [listResponse, limitsResponse, latestResponse] = await Promise.all([
        getServiceMonitorList(),
        getServiceMonitorLimits(),
        getServiceMonitorLatestResults(),
      ]);

      if (listResponse.code === 0 && Array.isArray(listResponse.data)) {
        setServiceMonitors(listResponse.data);
      } else {
        setServiceMonitorsError(listResponse.msg || "加载服务监控失败");
      }

      if (limitsResponse.code === 0 && limitsResponse.data) {
        setLimits(limitsResponse.data);
      }

      if (latestResponse.code === 0 && Array.isArray(latestResponse.data)) {
        const next: Record<number, ServiceMonitorResultApiItem> = {};
        latestResponse.data.forEach((item) => {
          next[item.monitorId] = item;
        });
        setLatestResults(next);
      }
    } catch {
      setServiceMonitorsError("加载服务监控失败");
    } finally {
      setServiceMonitorsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const allowed = await loadAccess();
      if (!allowed) return;
      await Promise.all([loadNodes(), loadTunnels(), loadServiceMonitors()]);
    })();
  }, [loadAccess, loadNodes, loadTunnels, loadServiceMonitors]);

  useEffect(() => {
    if (!selectedNodeId && nodes.length > 0) setSelectedNodeId(nodes[0].id);
  }, [nodes, selectedNodeId]);

  useEffect(() => {
    if (!selectedTunnelId && tunnels.length > 0) setSelectedTunnelId(tunnels[0].id);
  }, [tunnels, selectedTunnelId]);

  useEffect(() => {
    if (selectedNodeId) void loadNodeMetrics(selectedNodeId);
  }, [selectedNodeId, loadNodeMetrics]);

  useEffect(() => {
    if (selectedTunnelId) void loadTunnelMetrics(selectedTunnelId);
  }, [selectedTunnelId, loadTunnelMetrics]);

  const nodeChartData = useMemo(
    () => nodeMetrics.map((item) => ({ time: formatTimestamp(item.timestamp, rangeMs), cpu: item.cpuUsage, memory: item.memoryUsage })),
    [nodeMetrics, rangeMs],
  );

  const tunnelChartData = useMemo(
    () => tunnelMetrics.map((item) => ({ time: formatTimestamp(item.timestamp, rangeMs), bytesIn: item.bytesIn, bytesOut: item.bytesOut })),
    [tunnelMetrics, rangeMs],
  );

  const onlineNodes = nodes.filter((item) => item.status === 1).length;
  const activeTunnels = tunnels.filter((item) => item.status === 1).length;

  const openCreateModal = () => {
    setEditingMonitor(null);
    setForm({
      name: "",
      type: "tcp",
      target: "",
      intervalSec: limits.defaultIntervalSec,
      timeoutSec: limits.defaultTimeoutSec,
      nodeId: 0,
      enabled: 1,
    });
    setModalOpen(true);
  };

  const openEditModal = (item: ServiceMonitorApiItem) => {
    setEditingMonitor(item);
    setForm({
      id: item.id,
      name: item.name,
      type: item.type,
      target: item.target,
      intervalSec: item.intervalSec,
      timeoutSec: item.timeoutSec,
      nodeId: item.nodeId,
      enabled: item.enabled,
    });
    setModalOpen(true);
  };

  const submitMonitor = async () => {
    if (!form.name || !form.target) {
      toast.error("请填写完整信息");
      return;
    }
    if ((form.type === "icmp") && (!form.nodeId || form.nodeId <= 0)) {
      toast.error("ICMP 监控必须选择执行节点");
      return;
    }
    setSubmitLoading(true);
    try {
      const response = editingMonitor
        ? await updateServiceMonitor(form)
        : await createServiceMonitor(form);
      if (response.code === 0) {
        toast.success(editingMonitor ? "更新成功" : "创建成功");
        setModalOpen(false);
        await loadServiceMonitors();
      } else {
        toast.error(response.msg || "保存失败");
      }
    } catch {
      toast.error("保存失败");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteMonitor = async (id: number) => {
    const response = await deleteServiceMonitor(id);
    if (response.code === 0) {
      toast.success("删除成功");
      await loadServiceMonitors();
      return;
    }
    toast.error(response.msg || "删除失败");
  };

  const handleRunMonitor = async (id: number) => {
    const response = await runServiceMonitor(id);
    if (response.code === 0 && response.data) {
      toast.success(response.data.success === 1 ? "检查成功" : response.data.errorMessage || "检查失败");
      setLatestResults((prev) => ({ ...prev, [id]: response.data as ServiceMonitorResultApiItem }));
      return;
    }
    toast.error(response.msg || "执行失败");
  };

  if (accessAllowed === null) {
    return <PageLoadingState message="正在加载监控权限..." />;
  }

  if (!accessAllowed) {
    return <PageErrorState className="h-[60vh]" message={accessMessage} />;
  }

  return (
    <AnimatedPage className="space-y-6 px-3 py-6 lg:px-6 lg:py-8">
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">监控</h1>
            <p className="text-sm text-default-500">节点指标、隧道流量与服务探测一体化总览</p>
          </div>
          <Button
            size="sm"
            variant="flat"
            onPress={() => {
              void Promise.all([loadNodes(), loadTunnels(), loadServiceMonitors()]);
              if (selectedNodeId) void loadNodeMetrics(selectedNodeId);
              if (selectedTunnelId) void loadTunnelMetrics(selectedTunnelId);
            }}
          >
            <RefreshCw className="mr-1 h-4 w-4" /> 刷新
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="border border-border/70 bg-gradient-to-br from-sky-50 to-white dark:from-slate-900 dark:to-slate-950">
            <CardBody className="flex flex-row items-center justify-between py-5">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-default-500">在线节点</div>
                <div className="mt-2 text-2xl font-semibold">{onlineNodes}</div>
              </div>
              <Server className="h-8 w-8 text-sky-500" />
            </CardBody>
          </Card>
          <Card className="border border-border/70 bg-gradient-to-br from-emerald-50 to-white dark:from-slate-900 dark:to-slate-950">
            <CardBody className="flex flex-row items-center justify-between py-5">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-default-500">启用隧道</div>
                <div className="mt-2 text-2xl font-semibold">{activeTunnels}</div>
              </div>
              <Waypoints className="h-8 w-8 text-emerald-500" />
            </CardBody>
          </Card>
          <Card className="border border-border/70 bg-gradient-to-br from-amber-50 to-white dark:from-slate-900 dark:to-slate-950">
            <CardBody className="flex flex-row items-center justify-between py-5">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-default-500">服务监控</div>
                <div className="mt-2 text-2xl font-semibold">{serviceMonitors.length}</div>
              </div>
              <Activity className="h-8 w-8 text-amber-500" />
            </CardBody>
          </Card>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Select
          className="w-40"
          selectedKeys={[String(rangeMs)]}
          onSelectionChange={(keys) => {
            const next = Number(Array.from(keys)[0]);
            if (next > 0) setRangeMs(next);
          }}
        >
          {RANGE_OPTIONS.map((item) => (
            <SelectItem key={String(item.value)}>{item.label}</SelectItem>
          ))}
        </Select>
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border border-border/70">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <div className="text-lg font-semibold">节点资源</div>
              <div className="text-xs text-default-500">CPU 与内存历史曲线</div>
            </div>
            <div className="w-44">
              <Select
                placeholder={nodesLoading ? "加载中..." : "选择节点"}
                selectedKeys={selectedNodeId ? [String(selectedNodeId)] : []}
                onSelectionChange={(keys) => {
                  const value = Number(Array.from(keys)[0]);
                  setSelectedNodeId(value || null);
                }}
              >
                {nodes.map((node) => (
                  <SelectItem key={String(node.id)}>
                    {node.name}
                    {node.status === 1 ? "" : " (离线)"}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </CardHeader>
          <CardBody>
            {nodeMetricsLoading ? (
              <PageLoadingState className="h-64" message="正在加载节点指标..." />
            ) : nodeMetricsError ? (
              <PageErrorState className="h-64" message={nodeMetricsError} />
            ) : nodeChartData.length === 0 ? (
              <PageEmptyState className="h-64" message="暂无节点指标数据" />
            ) : (
              <div className="h-72">
                <ResponsiveContainer height="100%" width="100%">
                  <LineChart data={nodeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={metricTickFormatter} />
                    <Tooltip />
                    <Line dataKey="cpu" dot={false} name="CPU %" stroke="#0ea5e9" strokeWidth={2} type="monotone" />
                    <Line dataKey="memory" dot={false} name="内存 %" stroke="#f59e0b" strokeWidth={2} type="monotone" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="border border-border/70">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <div className="text-lg font-semibold">隧道流量</div>
              <div className="text-xs text-default-500">入站与出站流量聚合趋势</div>
            </div>
            <div className="w-44">
              <Select
                placeholder={tunnelsLoading ? "加载中..." : "选择隧道"}
                selectedKeys={selectedTunnelId ? [String(selectedTunnelId)] : []}
                onSelectionChange={(keys) => {
                  const value = Number(Array.from(keys)[0]);
                  setSelectedTunnelId(value || null);
                }}
              >
                {tunnels.map((tunnel) => (
                  <SelectItem key={String(tunnel.id)}>
                    {tunnel.name}
                    {tunnel.status === 1 ? "" : " (禁用)"}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </CardHeader>
          <CardBody>
            {tunnelMetricsLoading ? (
              <PageLoadingState className="h-64" message="正在加载隧道指标..." />
            ) : tunnelMetricsError ? (
              <PageErrorState className="h-64" message={tunnelMetricsError} />
            ) : tunnelChartData.length === 0 ? (
              <PageEmptyState className="h-64" message="暂无隧道指标数据" />
            ) : (
              <div className="h-72">
                <ResponsiveContainer height="100%" width="100%">
                  <LineChart data={tunnelChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={bytesTickFormatter} />
                    <Tooltip formatter={(value: unknown) => formatBytes(Number(value))} />
                    <Line dataKey="bytesIn" dot={false} name="入站" stroke="#10b981" strokeWidth={2} type="monotone" />
                    <Line dataKey="bytesOut" dot={false} name="出站" stroke="#ef4444" strokeWidth={2} type="monotone" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </section>

      <Card className="border border-border/70">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="text-lg font-semibold">服务监控</div>
            <div className="text-xs text-default-500">
              TCP / ICMP 主动探测，当前默认间隔 {limits.defaultIntervalSec}s，超时 {limits.defaultTimeoutSec}s
            </div>
          </div>
          <Button color="primary" size="sm" variant="flat" onPress={openCreateModal}>
            <Plus className="mr-1 h-4 w-4" /> 添加监控
          </Button>
        </CardHeader>
        <CardBody>
          {serviceMonitorsLoading ? (
            <PageLoadingState className="h-40" message="正在加载服务监控..." />
          ) : serviceMonitorsError ? (
            <PageErrorState className="h-40" message={serviceMonitorsError} />
          ) : serviceMonitors.length === 0 ? (
            <PageEmptyState className="h-40" message="暂无服务监控项" />
          ) : (
            <Table aria-label="服务监控列表">
              <TableHeader>
                <TableColumn>名称</TableColumn>
                <TableColumn>类型</TableColumn>
                <TableColumn>目标</TableColumn>
                <TableColumn>节点</TableColumn>
                <TableColumn>间隔/超时</TableColumn>
                <TableColumn>最新结果</TableColumn>
                <TableColumn>操作</TableColumn>
              </TableHeader>
              <TableBody>
                {serviceMonitors.map((item) => {
                  const latest = latestResults[item.id] || null;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <Chip color="primary" size="sm" variant="flat">
                          {String(item.type).toUpperCase()}
                        </Chip>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.target}</TableCell>
                      <TableCell>
                        {item.nodeId > 0
                          ? nodes.find((node) => node.id === item.nodeId)?.name || item.nodeId
                          : "本机"}
                      </TableCell>
                      <TableCell>{item.intervalSec}s / {item.timeoutSec}s</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Chip
                            color={latest?.success === 1 ? "success" : latest ? "danger" : "default"}
                            size="sm"
                            variant="flat"
                          >
                            {successLabel(latest)}
                          </Chip>
                          {latest ? (
                            <div className="text-xs text-default-500">
                              {formatDateTime(latest.timestamp)}
                              {latest.latencyMs > 0 ? ` · ${latest.latencyMs.toFixed(0)}ms` : ""}
                              {latest.errorMessage ? ` · ${latest.errorMessage}` : ""}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button isIconOnly size="sm" variant="flat" onPress={() => openEditModal(item)}>
                            <Activity className="h-4 w-4" />
                          </Button>
                          <Button isIconOnly size="sm" variant="flat" onPress={() => void handleRunMonitor(item.id)}>
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button isIconOnly size="sm" variant="flat" onPress={() => void handleDeleteMonitor(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={modalOpen} onOpenChange={setModalOpen}>
        <ModalContent>
          <ModalHeader>{editingMonitor ? "编辑监控" : "新建监控"}</ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="名称"
              value={String(form.name || "")}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            <Select
              label="类型"
              selectedKeys={[String(form.type || "tcp")]}
              onSelectionChange={(keys) => setForm((prev) => ({ ...prev, type: String(Array.from(keys)[0]) }))}
            >
              <SelectItem key="tcp">TCP</SelectItem>
              <SelectItem key="icmp">ICMP</SelectItem>
            </Select>
            <Input
              label="目标"
              value={String(form.target || "")}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, target: event.target.value }))
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="检查间隔(秒)"
                type="number"
                value={String(form.intervalSec || limits.defaultIntervalSec)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    intervalSec:
                      Number(event.target.value) || limits.defaultIntervalSec,
                  }))
                }
              />
              <Input
                label="超时(秒)"
                type="number"
                value={String(form.timeoutSec || limits.defaultTimeoutSec)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    timeoutSec:
                      Number(event.target.value) || limits.defaultTimeoutSec,
                  }))
                }
              />
            </div>
            <Select
              label="执行节点（ICMP 必填）"
              selectedKeys={[String(form.nodeId || 0)]}
              onSelectionChange={(keys) => setForm((prev) => ({ ...prev, nodeId: Number(Array.from(keys)[0]) || 0 }))}
            >
              <SelectItem key="0">本机 / 无指定</SelectItem>
              {nodes.map((node) => (
                <SelectItem key={String(node.id)}>{node.name}</SelectItem>
              ))}
            </Select>
            <Switch
              isSelected={Number(form.enabled ?? 1) === 1}
              onValueChange={(value) => setForm((prev) => ({ ...prev, enabled: value ? 1 : 0 }))}
            >
              启用监控
            </Switch>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setModalOpen(false)}>取消</Button>
            <Button color="primary" isLoading={submitLoading} onPress={() => void submitMonitor()}>
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AnimatedPage>
  );
}
