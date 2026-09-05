package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type resourceUseCase struct {
	repo domain.ResourceRepository
}

func NewResourceUseCase(repo domain.ResourceRepository) domain.ResourceUseCase {
	return &resourceUseCase{repo: repo}
}

func (u *resourceUseCase) ListResources(ctx context.Context) ([]domain.Resource, error) {
	return u.repo.GetAllResources(ctx)
}

func (u *resourceUseCase) GetResource(ctx context.Context, id uuid.UUID) (*domain.Resource, error) {
	return u.repo.GetResourceByID(ctx, id)
}

func (u *resourceUseCase) CreateResource(ctx context.Context, res *domain.Resource) error {
	if res.Name == "" {
		return errors.New("resource name is required")
	}
	if res.Type == "" {
		res.Type = domain.ResourceTypeEquipment
	}
	if res.Status == "" {
		res.Status = "AVAILABLE"
	}
	if res.Quantity <= 0 {
		res.Quantity = 1
	}
	return u.repo.CreateResource(ctx, res)
}

func (u *resourceUseCase) UpdateResource(ctx context.Context, res *domain.Resource) error {
	existing, err := u.repo.GetResourceByID(ctx, res.ID)
	if err != nil {
		return errors.New("resource not found")
	}
	existing.Name = res.Name
	existing.Type = res.Type
	existing.Description = res.Description
	existing.Location = res.Location
	existing.Capacity = res.Capacity
	existing.Quantity = res.Quantity
	existing.Status = res.Status
	existing.Custodian = res.Custodian
	existing.ImageURL = res.ImageURL
	existing.Tags = res.Tags
	existing.UpdatedAt = time.Now()

	return u.repo.UpdateResource(ctx, existing)
}

func (u *resourceUseCase) DeleteResource(ctx context.Context, id uuid.UUID) error {
	return u.repo.DeleteResource(ctx, id)
}

func (u *resourceUseCase) SeedDefaultResources(ctx context.Context) ([]domain.Resource, error) {
	existing, err := u.repo.GetAllResources(ctx)
	if err == nil && len(existing) > 0 {
		return existing, nil
	}

	samples := []domain.Resource{
		{
			Name:        "STEM Robotics & AI Innovation Lab",
			Type:        domain.ResourceTypeLab,
			Location:    "Science Wing, Floor 2 (Room S-204)",
			Capacity:    35,
			Quantity:    1,
			Status:      "AVAILABLE",
			Custodian:   "Dr. Kwame Mensah (Dept. Head)",
			Tags:        "Robotics, 3D Printers, Python, Arduino",
			Description: "Equipped with 30 high-spec workstations, 3D rapid prototyping printers, and modular VEX robotics kits.",
		},
		{
			Name:        "Advanced Chemistry & Spectroscopy Lab",
			Type:        domain.ResourceTypeLab,
			Location:    "Science Wing, Ground Floor (Room S-102)",
			Capacity:    40,
			Quantity:    1,
			Status:      "AVAILABLE",
			Custodian:   "Mrs. Adelaide Asante",
			Tags:        "Fume Hoods, Bunsen Burners, Titration, Safety Shower",
			Description: "Full-grade analytical chemistry laboratory with certified extraction fume hoods, emergency showers, and optical spectrometers.",
		},
		{
			Name:        "Digital Multimedia & Podcasting Studio",
			Type:        domain.ResourceTypeLab,
			Location:    "Arts & Media Center (Room A-108)",
			Capacity:    15,
			Quantity:    1,
			Status:      "AVAILABLE",
			Custodian:   "Mr. Samuel Osei (Media Dept)",
			Tags:        "4K Cameras, Shure Microphones, Green Screen, DaVinci Resolve",
			Description: "Acoustically isolated studio with 4K broadcast cameras, Rodecaster Pro audio mixers, and studio studio lighting.",
		},
		{
			Name:        "4K Interactive Smartboard & Poly Studio Hub",
			Type:        domain.ResourceTypeEquipment,
			Location:    "Central IT Depot (Rack Unit #4)",
			Capacity:    1,
			Quantity:    6,
			Status:      "AVAILABLE",
			Custodian:   "IT Helpdesk Services",
			Tags:        "Smartboard, 4K Touch, Hybrid Zoom, Wireless HDMI",
			Description: "Mobile 75-inch 4K touchscreen interactive whiteboard on motorized rolling stand with integrated wireless casting.",
		},
		{
			Name:        "Olympus Research Optical Microscope Suite (Set of 12)",
			Type:        domain.ResourceTypeEquipment,
			Location:    "Biology Prep Room (Cabinet B)",
			Capacity:    12,
			Quantity:    12,
			Status:      "AVAILABLE",
			Custodian:   "Lab Technician",
			Tags:        "1000x Magnification, LED Illumination, Oil Immersion",
			Description: "High-precision compound binocular optical microscopes with digital USB imaging sensor for cellular observation.",
		},
		{
			Name:        "Toyota HiAce 16-Seater Campus Field Shuttle (Reg: GW-4022-24)",
			Type:        domain.ResourceTypeVehicle,
			Location:    "Main Campus Transport Bay #2",
			Capacity:    16,
			Quantity:    1,
			Status:      "AVAILABLE",
			Custodian:   "Campus Transport Officer",
			Tags:        "Field Trips, Sports Tours, Air-Conditioned, Speed-Governed",
			Description: "Air-conditioned 16-seater passenger van with first aid kit and GPS telematics tracker for academic excursions.",
		},
		{
			Name:        "Main Olympic Gymnasium & Indoor Basketball Arena",
			Type:        domain.ResourceTypeSports,
			Location:    "Athletics Pavilion (Court 1)",
			Capacity:    300,
			Quantity:    1,
			Status:      "AVAILABLE",
			Custodian:   "Coach Boateng",
			Tags:        "Hardwood Flooring, Electronic Scoreboard, Bleachers, FIBA Certified",
			Description: "Full indoor hardwood court for basketball, badminton, volleyball tournaments, and full-school indoor convocations.",
		},
	}

	for _, s := range samples {
		_ = u.repo.CreateResource(ctx, &s)
	}

	return u.repo.GetAllResources(ctx)
}

func (u *resourceUseCase) BookResource(ctx context.Context, booking *domain.Booking) error {
	// 1. Validate time
	if booking.StartTime.After(booking.EndTime) || booking.StartTime.Equal(booking.EndTime) {
		return errors.New("start time must be strictly before end time")
	}

	// 2. Check for resource existence
	res, err := u.repo.GetResourceByID(ctx, booking.ResourceID)
	if err != nil || res == nil {
		return errors.New("resource not found")
	}

	// 3. Check for overlaps
	overlaps, err := u.repo.CheckOverlap(ctx, booking.ResourceID, booking.StartTime, booking.EndTime)
	if err != nil {
		return err
	}
	if overlaps {
		return errors.New("resource is already booked for this requested time period. Please select another slot.")
	}

	booking.Status = domain.BookingStatusConfirmed
	return u.repo.CreateBooking(ctx, booking)
}

func (u *resourceUseCase) CancelBooking(ctx context.Context, bookingID uuid.UUID) error {
	return u.repo.CancelBooking(ctx, bookingID)
}

func (u *resourceUseCase) MyBookings(ctx context.Context, userID uuid.UUID) ([]domain.Booking, error) {
	bookings, err := u.repo.GetBookingsByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	u.populateBookingDetails(ctx, bookings)
	return bookings, nil
}

func (u *resourceUseCase) AllBookings(ctx context.Context) ([]domain.Booking, error) {
	bookings, err := u.repo.GetAllBookings(ctx)
	if err != nil {
		return nil, err
	}
	u.populateBookingDetails(ctx, bookings)
	return bookings, nil
}

func (u *resourceUseCase) populateBookingDetails(ctx context.Context, bookings []domain.Booking) {
	for i := range bookings {
		res, err := u.repo.GetResourceByID(ctx, bookings[i].ResourceID)
		if err == nil && res != nil {
			bookings[i].ResourceName = res.Name
			bookings[i].ResourceType = string(res.Type)
		}
	}
}
