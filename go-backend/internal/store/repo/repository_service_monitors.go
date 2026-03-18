package repo

import (
	"errors"

	"go-backend/internal/store/model"

	"gorm.io/gorm"
)

func (r *Repository) GetConfigsByNames(names []string) (map[string]string, error) {
	if r == nil || r.db == nil {
		return nil, errors.New("repository not initialized")
	}
	if len(names) == 0 {
		return map[string]string{}, nil
	}
	var rows []model.ViteConfig
	if err := r.db.Where("name IN ?", names).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make(map[string]string, len(rows))
	for _, row := range rows {
		out[row.Name] = row.Value
	}
	return out, nil
}

func (r *Repository) CreateServiceMonitor(item *model.ServiceMonitor) error {
	if r == nil || r.db == nil {
		return errors.New("repository not initialized")
	}
	if item == nil {
		return nil
	}
	return r.db.Create(item).Error
}

func (r *Repository) UpdateServiceMonitor(item *model.ServiceMonitor) error {
	if r == nil || r.db == nil {
		return errors.New("repository not initialized")
	}
	if item == nil || item.ID <= 0 {
		return nil
	}
	return r.db.Model(&model.ServiceMonitor{}).Where("id = ?", item.ID).Updates(map[string]interface{}{
		"name":         item.Name,
		"type":         item.Type,
		"target":       item.Target,
		"interval_sec": item.IntervalSec,
		"timeout_sec":  item.TimeoutSec,
		"node_id":      item.NodeID,
		"enabled":      item.Enabled,
		"updated_time": item.UpdatedTime,
	}).Error
}

func (r *Repository) ListServiceMonitors() ([]model.ServiceMonitor, error) {
	if r == nil || r.db == nil {
		return nil, errors.New("repository not initialized")
	}
	var items []model.ServiceMonitor
	err := r.db.Order("id ASC").Find(&items).Error
	return items, err
}

func (r *Repository) ListEnabledServiceMonitors() ([]model.ServiceMonitor, error) {
	if r == nil || r.db == nil {
		return nil, errors.New("repository not initialized")
	}
	var items []model.ServiceMonitor
	err := r.db.Where("enabled = 1").Order("id ASC").Find(&items).Error
	return items, err
}

func (r *Repository) GetServiceMonitor(id int64) (*model.ServiceMonitor, error) {
	if r == nil || r.db == nil {
		return nil, errors.New("repository not initialized")
	}
	var item model.ServiceMonitor
	err := r.db.Where("id = ?", id).First(&item).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *Repository) DeleteServiceMonitor(id int64) error {
	if r == nil || r.db == nil {
		return errors.New("repository not initialized")
	}
	if id <= 0 {
		return nil
	}
	if err := r.db.Where("monitor_id = ?", id).Delete(&model.ServiceMonitorResult{}).Error; err != nil {
		return err
	}
	return r.db.Where("id = ?", id).Delete(&model.ServiceMonitor{}).Error
}

func (r *Repository) InsertServiceMonitorResult(item *model.ServiceMonitorResult) error {
	if r == nil || r.db == nil {
		return errors.New("repository not initialized")
	}
	if item == nil {
		return nil
	}
	return r.db.Create(item).Error
}

func (r *Repository) GetServiceMonitorResults(monitorID int64, limit int) ([]model.ServiceMonitorResult, error) {
	if r == nil || r.db == nil {
		return nil, errors.New("repository not initialized")
	}
	if limit <= 0 {
		limit = 100
	}
	var items []model.ServiceMonitorResult
	err := r.db.Where("monitor_id = ?", monitorID).Order("timestamp DESC").Limit(limit).Find(&items).Error
	return items, err
}

func (r *Repository) GetLatestServiceMonitorResults() ([]model.ServiceMonitorResult, error) {
	if r == nil || r.db == nil {
		return nil, errors.New("repository not initialized")
	}
	var all []model.ServiceMonitorResult
	if err := r.db.Order("monitor_id ASC, timestamp DESC, id DESC").Find(&all).Error; err != nil {
		return nil, err
	}
	seen := make(map[int64]struct{}, len(all))
	out := make([]model.ServiceMonitorResult, 0)
	for _, item := range all {
		if _, ok := seen[item.MonitorID]; ok {
			continue
		}
		seen[item.MonitorID] = struct{}{}
		out = append(out, item)
	}
	return out, nil
}

func (r *Repository) PruneServiceMonitorResults(cutoffMs int64) error {
	if r == nil || r.db == nil {
		return errors.New("repository not initialized")
	}
	return r.db.Where("timestamp < ?", cutoffMs).Delete(&model.ServiceMonitorResult{}).Error
}

func (r *Repository) InsertNodeMetric(item *model.NodeMetric) error {
	if r == nil || r.db == nil {
		return errors.New("repository not initialized")
	}
	if item == nil {
		return nil
	}
	return r.db.Create(item).Error
}

func (r *Repository) InsertTunnelMetric(item *model.TunnelMetric) error {
	if r == nil || r.db == nil {
		return errors.New("repository not initialized")
	}
	if item == nil {
		return nil
	}
	return r.db.Create(item).Error
}

func (r *Repository) InsertTunnelMetricBatch(items []*model.TunnelMetric) error {
	if r == nil || r.db == nil {
		return errors.New("repository not initialized")
	}
	if len(items) == 0 {
		return nil
	}
	return r.db.Create(&items).Error
}

func (r *Repository) GetTunnelMetrics(tunnelID, startMs, endMs int64) ([]model.TunnelMetric, error) {
	if r == nil || r.db == nil {
		return nil, errors.New("repository not initialized")
	}
	var items []model.TunnelMetric
	err := r.db.Where("tunnel_id = ? AND timestamp >= ? AND timestamp <= ?", tunnelID, startMs, endMs).
		Order("timestamp ASC").Find(&items).Error
	return items, err
}
