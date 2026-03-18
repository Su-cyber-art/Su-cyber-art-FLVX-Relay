package repo

import (
	"errors"

	"go-backend/internal/store/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (r *Repository) ListMonitorTunnels() ([]model.Tunnel, error) {
	if r == nil || r.db == nil {
		return nil, errors.New("repository not initialized")
	}
	var tunnels []model.Tunnel
	err := r.db.Select("id", "inx", "name", "status", "updated_time").
		Order("inx ASC, id ASC").
		Find(&tunnels).Error
	return tunnels, err
}

func (r *Repository) UpsertTunnelMetricBuckets(items []*model.TunnelMetric) error {
	if r == nil || r.db == nil {
		return errors.New("repository not initialized")
	}
	if len(items) == 0 {
		return nil
	}
	return r.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "tunnel_id"}, {Name: "node_id"}, {Name: "timestamp"}},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"bytes_in":       gorm.Expr("tunnel_metric.bytes_in + excluded.bytes_in"),
			"bytes_out":      gorm.Expr("tunnel_metric.bytes_out + excluded.bytes_out"),
			"connections":    gorm.Expr("tunnel_metric.connections + excluded.connections"),
			"errors":         gorm.Expr("tunnel_metric.errors + excluded.errors"),
			"avg_latency_ms": gorm.Expr("excluded.avg_latency_ms"),
		}),
	}).Create(&items).Error
}

func (r *Repository) GetTunnelMetricsAggregated(tunnelID, startMs, endMs int64) ([]model.TunnelMetric, error) {
	if r == nil || r.db == nil {
		return nil, errors.New("repository not initialized")
	}
	var items []model.TunnelMetric
	err := r.db.Model(&model.TunnelMetric{}).
		Select("tunnel_id, timestamp, SUM(bytes_in) AS bytes_in, SUM(bytes_out) AS bytes_out, SUM(connections) AS connections, SUM(errors) AS errors, AVG(avg_latency_ms) AS avg_latency_ms").
		Where("tunnel_id = ? AND timestamp >= ? AND timestamp <= ?", tunnelID, startMs, endMs).
		Group("tunnel_id, timestamp").
		Order("timestamp ASC").
		Find(&items).Error
	return items, err
}

func (r *Repository) PruneTunnelMetrics(cutoffMs int64) error {
	if r == nil || r.db == nil {
		return errors.New("repository not initialized")
	}
	return r.db.Where("timestamp < ?", cutoffMs).Delete(&model.TunnelMetric{}).Error
}
