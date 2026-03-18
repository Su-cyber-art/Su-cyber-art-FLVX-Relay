package repo

import (
	"errors"

	"go-backend/internal/store/model"
	"gorm.io/gorm"
)

func (r *Repository) ListMonitorNodes() ([]model.Node, error) {
	if r == nil || r.db == nil {
		return nil, errors.New("repository not initialized")
	}
	var nodes []model.Node
	err := r.db.Select("id", "inx", "name", "status", "updated_time").
		Order("inx ASC, id ASC").
		Find(&nodes).Error
	return nodes, err
}

func (r *Repository) InsertNodeMetricBatch(items []*model.NodeMetric) error {
	if r == nil || r.db == nil {
		return errors.New("repository not initialized")
	}
	if len(items) == 0 {
		return nil
	}
	return r.db.Create(&items).Error
}

func (r *Repository) GetNodeMetrics(nodeID, startMs, endMs int64) ([]model.NodeMetric, error) {
	if r == nil || r.db == nil {
		return nil, errors.New("repository not initialized")
	}
	var items []model.NodeMetric
	err := r.db.Where("node_id = ? AND timestamp >= ? AND timestamp <= ?", nodeID, startMs, endMs).
		Order("timestamp ASC").
		Find(&items).Error
	return items, err
}

func (r *Repository) GetLatestNodeMetric(nodeID int64) (*model.NodeMetric, error) {
	if r == nil || r.db == nil {
		return nil, errors.New("repository not initialized")
	}
	var item model.NodeMetric
	err := r.db.Where("node_id = ?", nodeID).Order("timestamp DESC").First(&item).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *Repository) PruneNodeMetrics(cutoffMs int64) error {
	if r == nil || r.db == nil {
		return errors.New("repository not initialized")
	}
	return r.db.Where("timestamp < ?", cutoffMs).Delete(&model.NodeMetric{}).Error
}
