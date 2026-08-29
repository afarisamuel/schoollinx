package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/user/high-school-management/backend/internal/domain"
)

type facilityRepository struct {
	db *gorm.DB
}

func NewFacilityRepository(db *gorm.DB) domain.FacilityRepository {
	return &facilityRepository{db: db}
}

// Inventory
func (r *facilityRepository) GetInventoryItems(ctx context.Context) ([]domain.InventoryItem, error) {
	var items []domain.InventoryItem
	if err := r.db.WithContext(ctx).Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (r *facilityRepository) CreateInventoryItem(ctx context.Context, item *domain.InventoryItem) error {
	item.LastUpdated = time.Now()
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *facilityRepository) UpdateInventoryQuantity(ctx context.Context, id uuid.UUID, quantity int) error {
	return r.db.WithContext(ctx).Model(&domain.InventoryItem{}).Where("id = ?", id).Updates(map[string]interface{}{
		"quantity":     quantity,
		"last_updated": time.Now(),
	}).Error
}

func (r *facilityRepository) DeleteInventoryItem(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.InventoryItem{}, "id = ?", id).Error
}

// Barcode Asset Checkouts (Feature 19)
func (r *facilityRepository) CreateAssetCheckout(ctx context.Context, checkout *domain.AssetCheckout) error {
	if checkout.ID == uuid.Nil {
		checkout.ID = uuid.New()
	}
	if checkout.CheckedOutAt.IsZero() {
		checkout.CheckedOutAt = time.Now()
	}
	return r.db.WithContext(ctx).Create(checkout).Error
}

func (r *facilityRepository) UpdateAssetReturn(ctx context.Context, checkoutID uuid.UUID, condition string, returnedAt time.Time) error {
	return r.db.WithContext(ctx).Model(&domain.AssetCheckout{}).Where("id = ?", checkoutID).Updates(map[string]interface{}{
		"returned_at": &returnedAt,
		"condition":   condition,
	}).Error
}

func (r *facilityRepository) GetActiveAssetCheckouts(ctx context.Context) ([]domain.AssetCheckout, error) {
	var checkouts []domain.AssetCheckout
	err := r.db.WithContext(ctx).Where("returned_at IS NULL").Order("due_date ASC").Find(&checkouts).Error
	return checkouts, err
}

// Visitors
func (r *facilityRepository) GetVisitorLogs(ctx context.Context, date time.Time) ([]domain.VisitorLog, error) {
	var logs []domain.VisitorLog
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)
	
	if err := r.db.WithContext(ctx).Where("check_in >= ? AND check_in < ?", startOfDay, endOfDay).Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}

func (r *facilityRepository) CheckInVisitor(ctx context.Context, log *domain.VisitorLog) error {
	log.CheckIn = time.Now()
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *facilityRepository) CheckOutVisitor(ctx context.Context, id uuid.UUID, checkOutTime time.Time) error {
	return r.db.WithContext(ctx).Model(&domain.VisitorLog{}).Where("id = ?", id).Update("check_out", checkOutTime).Error
}

func (r *facilityRepository) UpdateInventoryItem(ctx context.Context, item *domain.InventoryItem) error {
	item.LastUpdated = time.Now()
	return r.db.WithContext(ctx).Save(item).Error
}

// Rooms & Bookings
func (r *facilityRepository) GetRooms(ctx context.Context) ([]domain.Room, error) {
	var rooms []domain.Room
	err := r.db.WithContext(ctx).Find(&rooms).Error
	return rooms, err
}

func (r *facilityRepository) CreateRoom(ctx context.Context, room *domain.Room) error {
	return r.db.WithContext(ctx).Create(room).Error
}

func (r *facilityRepository) GetRoomBookings(ctx context.Context, roomID uuid.UUID, date time.Time) ([]domain.RoomBooking, error) {
	var bookings []domain.RoomBooking
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)
	err := r.db.WithContext(ctx).Preload("Room").Where("room_id = ? AND start_time >= ? AND start_time < ?", roomID, startOfDay, endOfDay).Find(&bookings).Error
	return bookings, err
}

func (r *facilityRepository) CreateRoomBooking(ctx context.Context, booking *domain.RoomBooking) error {
	return r.db.WithContext(ctx).Create(booking).Error
}

func (r *facilityRepository) DeleteRoomBooking(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.RoomBooking{}, "id = ?", id).Error
}

func (r *facilityRepository) CheckRoomAvailability(ctx context.Context, roomID uuid.UUID, start, end time.Time) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.RoomBooking{}).
		Where("room_id = ? AND ((start_time < ? AND end_time > ?))", roomID, end, start).
		Count(&count).Error
	return count == 0, err
}

func (r *facilityRepository) LogFacilityUsage(ctx context.Context, log *domain.FacilityUsageLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *facilityRepository) GetResourceHeatmap(ctx context.Context) ([]domain.ResourceHeatmap, error) {
	// To keep it database agnostic and simple, we'll fetch bookings for the last 30 days
	// and compute the heatmap utilization here.
	var bookings []domain.RoomBooking
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	
	if err := r.db.WithContext(ctx).Preload("Room").
		Where("start_time >= ?", thirtyDaysAgo).
		Find(&bookings).Error; err != nil {
		return nil, err
	}

	// map[RoomName][DayOfWeek][HourOfDay] -> count
	heatmapData := make(map[string]map[int]map[int]int)

	for _, b := range bookings {
		if b.Room == nil {
			continue
		}
		
		start := b.StartTime
		end := b.EndTime
		
		// For simplicity, we just log the start hour for the day of week.
		// A more accurate heatmap would interpolate across all hours of the booking.
		for t := start; t.Before(end); t = t.Add(time.Hour) {
			room := b.Room.Name
			day := int(t.Weekday()) // 0=Sun
			hour := t.Hour()

			if _, ok := heatmapData[room]; !ok {
				heatmapData[room] = make(map[int]map[int]int)
			}
			if _, ok := heatmapData[room][day]; !ok {
				heatmapData[room][day] = make(map[int]int)
			}
			heatmapData[room][day][hour]++
		}
	}

	var results []domain.ResourceHeatmap
	// Calculate utilization percentage. (Max 4 weeks in 30 days, so 4 instances of each DOW/Hour)
	// We'll normalize against 4.
	for room, days := range heatmapData {
		for day, hours := range days {
			for hour, count := range hours {
				util := (count * 100) / 4
				if util > 100 {
					util = 100
				}
				results = append(results, domain.ResourceHeatmap{
					RoomName:    room,
					DayOfWeek:   day,
					HourOfDay:   hour,
					Utilization: util,
				})
			}
		}
	}

	return results, nil
}
