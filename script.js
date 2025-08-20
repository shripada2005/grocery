// Garden Market App - Main JavaScript File

class GardenMarketApp {
    constructor() {
        this.map = null;
        this.markers = [];
        this.listings = [];
        this.currentFilters = {
            categories: ['vegetables', 'fruits', 'herbs', 'eggs', 'honey', 'other'],
            maxPrice: 50,
            maxDistance: 5
        };
        this.userLocation = null;

        this.init();
    }

    init() {
        this.initializeMap();
        this.setupEventListeners();
        this.loadSampleData();
        this.updateMap();
    }

    initializeMap() {
        // Initialize the map centered on a default location (you can change this)
        this.map = L.map('map').setView([40.7128, -74.0060], 13); // Default: NYC coordinates

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Try to get user's location
        this.getUserLocation();
    }

    setupEventListeners() {
        // Modal controls
        const addListingBtn = document.getElementById('addListingBtn');
        const addListingModal = document.getElementById('addListingModal');
        const closeModal = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const listingForm = document.getElementById('listingForm');

        addListingBtn.addEventListener('click', () => {
            addListingModal.classList.add('show');
        });

        closeModal.addEventListener('click', () => {
            addListingModal.classList.remove('show');
        });

        cancelBtn.addEventListener('click', () => {
            addListingModal.classList.remove('show');
        });

        // Close modal when clicking outside
        addListingModal.addEventListener('click', (e) => {
            if (e.target === addListingModal) {
                addListingModal.classList.remove('show');
            }
        });

        // Form submission
        listingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmission();
        });

        // Filter controls
        const filterCheckboxes = document.querySelectorAll('.filter-option input[type="checkbox"]');
        filterCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateFilters();
            });
        });

        const priceRange = document.getElementById('priceRange');
        const priceValue = document.getElementById('priceValue');
        priceRange.addEventListener('input', (e) => {
            const value = e.target.value;
            priceValue.textContent = `$${value}`;
            this.currentFilters.maxPrice = parseInt(value);
            this.updateMap();
        });

        const distanceRange = document.getElementById('distanceRange');
        const distanceValue = document.getElementById('distanceValue');
        distanceRange.addEventListener('input', (e) => {
            const value = e.target.value;
            distanceValue.textContent = `${value} mi`;
            this.currentFilters.maxDistance = parseFloat(value);
            this.updateMap();
        });

        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        clearFiltersBtn.addEventListener('click', () => {
            this.clearFilters();
        });

        // Map controls
        const locateMeBtn = document.getElementById('locateMeBtn');
        const resetViewBtn = document.getElementById('resetViewBtn');

        locateMeBtn.addEventListener('click', () => {
            this.getUserLocation();
        });

        resetViewBtn.addEventListener('click', () => {
            this.resetMapView();
        });
    }

    async getUserLocation() {
        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 60000
                    });
                });

                const { latitude, longitude } = position.coords;
                this.userLocation = { lat: latitude, lng: longitude };

                // Center map on user location
                this.map.setView([latitude, longitude], 15);

                // Add user location marker
                this.addUserLocationMarker(latitude, longitude);

            } catch (error) {
                console.log('Error getting location:', error);
                // Fall back to default location
                this.userLocation = { lat: 40.7128, lng: -74.0060 };
            }
        }
    }

    addUserLocationMarker(lat, lng) {
        // Remove existing user marker
        const existingMarker = this.map.userLocationMarker;
        if (existingMarker) {
            this.map.removeLayer(existingMarker);
        }

        // Add new user location marker
        const userIcon = L.divIcon({
            className: 'custom-marker',
            html: '📍',
            iconSize: [24, 24]
        });

        this.map.userLocationMarker = L.marker([lat, lng], { icon: userIcon })
            .addTo(this.map)
            .bindPopup('Your Location');
    }

    resetMapView() {
        if (this.userLocation) {
            this.map.setView([this.userLocation.lat, this.userLocation.lng], 15);
        } else {
            this.map.setView([40.7128, -74.0060], 13);
        }
    }

    updateFilters() {
        const checkedCategories = Array.from(
            document.querySelectorAll('.filter-option input[type="checkbox"]:checked')
        ).map(cb => cb.value);

        this.currentFilters.categories = checkedCategories;
        this.updateMap();
    }

    clearFilters() {
        // Reset checkboxes
        document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(cb => {
            cb.checked = true;
        });

        // Reset sliders
        document.getElementById('priceRange').value = 50;
        document.getElementById('priceValue').textContent = '$50';
        document.getElementById('distanceRange').value = 5;
        document.getElementById('distanceValue').textContent = '5 mi';

        // Reset filters
        this.currentFilters = {
            categories: ['vegetables', 'fruits', 'herbs', 'eggs', 'honey', 'other'],
            maxPrice: 50,
            maxDistance: 5
        };

        this.updateMap();
    }

    updateMap() {
        // Clear existing markers
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];

        // Filter listings based on current filters
        const filteredListings = this.listings.filter(listing => {
            // Category filter
            if (!this.currentFilters.categories.includes(listing.category)) {
                return false;
            }

            // Price filter
            if (listing.price > this.currentFilters.maxPrice) {
                return false;
            }

            // Distance filter (if user location is available)
            if (this.userLocation) {
                const distance = this.calculateDistance(
                    this.userLocation.lat,
                    this.userLocation.lng,
                    listing.lat,
                    listing.lng
                );
                if (distance > this.currentFilters.maxDistance) {
                    return false;
                }
            }

            return true;
        });

        // Add markers for filtered listings
        filteredListings.forEach(listing => {
            this.addListingMarker(listing);
        });
    }

    addListingMarker(listing) {
        const categoryIcons = {
            vegetables: '🥬',
            fruits: '🍎',
            herbs: '🌿',
            eggs: '🥚',
            honey: '🍯',
            other: '🌾'
        };

        const icon = L.divIcon({
            className: 'custom-marker',
            html: categoryIcons[listing.category] || '🌾',
            iconSize: [24, 24]
        });

        const marker = L.marker([listing.lat, listing.lng], { icon })
            .addTo(this.map)
            .bindPopup(this.createPopupContent(listing));

        marker.on('click', () => {
            this.showListingDetails(listing);
        });

        this.markers.push(marker);
    }

    createPopupContent(listing) {
        return `
            <div style="min-width: 200px;">
                <h4 style="margin: 0 0 8px 0; color: #1f2937;">${listing.name}</h4>
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                    ${listing.category.charAt(0).toUpperCase() + listing.category.slice(1)}
                </p>
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #10b981;">
                    $${listing.price.toFixed(2)} ${listing.unit}
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 13px;">
                    ${listing.address}
                </p>
            </div>
        `;
    }

    showListingDetails(listing) {
        const modal = document.getElementById('listingDetailsModal');
        const title = document.getElementById('detailTitle');
        const category = document.getElementById('detailCategory');
        const price = document.getElementById('detailPrice');
        const description = document.getElementById('detailDescription');
        const address = document.getElementById('detailAddress');
        const contact = document.getElementById('detailContact');

        title.textContent = listing.name;
        category.textContent = listing.category.charAt(0).toUpperCase() + listing.category.slice(1);
        price.textContent = `$${listing.price.toFixed(2)} ${listing.unit}`;
        description.textContent = listing.description || 'No description provided';
        address.textContent = listing.address;
        contact.textContent = listing.contact || 'No contact info provided';

        modal.classList.add('show');

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });

        // Close button
        document.getElementById('closeDetailsModal').addEventListener('click', () => {
            modal.classList.remove('show');
        });
    }

    async handleFormSubmission() {
        const formData = new FormData(document.getElementById('listingForm'));

        // Get form values
        const listing = {
            name: document.getElementById('produceName').value,
            category: document.getElementById('produceType').value,
            price: parseFloat(document.getElementById('price').value),
            unit: document.getElementById('unit').value,
            description: document.getElementById('description').value,
            address: document.getElementById('address').value,
            contact: document.getElementById('contact').value
        };

        // Geocode the address to get coordinates
        try {
            const coordinates = await this.geocodeAddress(listing.address);
            listing.lat = coordinates.lat;
            listing.lng = coordinates.lng;

            // Add to listings array
            this.listings.push(listing);

            // Update map
            this.updateMap();

            // Close modal and reset form
            document.getElementById('addListingModal').classList.remove('show');
            document.getElementById('listingForm').reset();

            // Show success message
            this.showNotification('Listing added successfully!', 'success');

        } catch (error) {
            console.error('Error geocoding address:', error);
            this.showNotification('Error: Could not find address coordinates. Please check the address.', 'error');
        }
    }

    async geocodeAddress(address) {
        // Using OpenStreetMap Nominatim API for geocoding
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            } else {
                throw new Error('Address not found');
            }
        } catch (error) {
            throw new Error('Geocoding failed');
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3959; // Earth's radius in miles
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance;
    }

    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '3000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            maxWidth: '300px'
        });

        // Set background color based on type
        if (type === 'success') {
            notification.style.backgroundColor = '#10b981';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#ef4444';
        } else {
            notification.style.backgroundColor = '#3b82f6';
        }

        // Add to DOM
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    loadSampleData() {
        // Sample listings for demonstration
        this.listings = [
            {
                name: "Fresh Organic Tomatoes",
                category: "vegetables",
                price: 3.50,
                unit: "lb",
                description: "Homegrown organic tomatoes, picked fresh daily. Perfect for salads and cooking.",
                address: "123 Garden Street, Brooklyn, NY",
                lat: 40.7128,
                lng: -74.0060
            },
            {
                name: "Sweet Strawberries",
                category: "fruits",
                price: 4.00,
                unit: "lb",
                description: "Sweet, juicy strawberries from our backyard garden. Limited quantity available.",
                address: "456 Orchard Avenue, Brooklyn, NY",
                lat: 40.7180,
                lng: -74.0040
            },
            {
                name: "Fresh Basil",
                category: "herbs",
                price: 2.50,
                unit: "bunch",
                description: "Aromatic fresh basil, perfect for Italian cooking and pesto.",
                address: "789 Herb Lane, Brooklyn, NY",
                lat: 40.7080,
                lng: -74.0080
            },
            {
                name: "Farm Fresh Eggs",
                category: "eggs",
                price: 5.00,
                unit: "dozen",
                description: "Fresh eggs from our backyard chickens. Free-range and organic feed.",
                address: "321 Farm Road, Brooklyn, NY",
                lat: 40.7150,
                lng: -74.0020
            },
            {
                name: "Local Honey",
                category: "honey",
                price: 8.00,
                unit: "jar",
                description: "Pure, raw honey from our local beehives. Great for tea and baking.",
                address: "654 Bee Street, Brooklyn, NY",
                lat: 40.7200,
                lng: -74.0100
            }
        ];
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GardenMarketApp();
});
