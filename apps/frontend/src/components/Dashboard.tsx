import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Car as CarIcon,
  Calendar,
  Clock,
  User,
  Settings,
  LogOut,
  Star,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Plus,
  Play
} from 'lucide-react';

interface CarResponse {
  id: string;
  name: string;
  license_plate: string;
  photo_url: string;
  priority: number;
  family_id: string;
}

interface UserMinResponse {
  id: string;
  name: string;
  email: string;
}

interface BookingResponse {
  id: string;
  car_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: string;
  purpose: string;
  user?: UserMinResponse;
  car?: {
    id: string;
    name: string;
    license_plate: string;
    photo_url: string;
  };
}

interface CarStatusResponse {
  car: CarResponse;
  status: 'available' | 'in_use';
  current_booking: BookingResponse | null;
  allowed_drivers: UserMinResponse[];
}

interface DashboardData {
  cars: CarStatusResponse[];
  upcoming_bookings: BookingResponse[];
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch Dashboard Stats
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<DashboardData>('/dashboard/');
      return response.data;
    },
    refetchInterval: 10000, // Auto refresh every 10s
  });

  // Return Car mutation
  const returnCarMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      await apiClient.put(`/bookings/${bookingId}/status`, { status: 'completed' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Cancel Booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      await apiClient.put(`/bookings/${bookingId}/status`, { status: 'cancelled' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div className="badge-primary animate-fade-in" style={{ padding: '16px 24px', fontSize: '18px' }}>
          Loading your dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div className="badge-danger" style={{ padding: '16px 24px', fontSize: '18px' }}>
          Error loading dashboard. Make sure the backend is running.
        </div>
      </div>
    );
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
  };

  const getPresetColor = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // Blue
      'linear-gradient(135deg, #10b981 0%, #047857 100%)', // Emerald
      'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', // Pink
      'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', // Amber
      'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', // Purple
      'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', // Cyan
    ];
    return colors[hash % colors.length];
  };

  return (
    <div className="app-container animate-fade-in">
      {/* Header */}
      <header className="header-nav">
        <div>
          <h1 className="brand">
            <CarIcon size={28} />
            <span>CarsManager</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Hello, <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{user?.name}</span>
          </p>
        </div>

        <div className="nav-links">
          {user?.role === 'manager' && (
            <button
              onClick={() => navigate('/admin')}
              className="btn btn-outline"
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              <Settings size={16} />
              Manage Family
            </button>
          )}
          <button
            onClick={logout}
            className="btn btn-danger"
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </header>

      {/* Quick Actions Panel */}
      <div className="glass-panel" style={{ marginBottom: '36px', padding: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px' }}>
          What would you like to do?
        </h2>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/use-now')}
            className="btn btn-primary"
            style={{ flex: 1, minWidth: '200px', padding: '16px' }}
          >
            <Play size={18} fill="currentColor" />
            Use Car Immediately
          </button>
          <button
            onClick={() => navigate('/schedule')}
            className="btn btn-secondary"
            style={{ flex: 1, minWidth: '200px', padding: '16px' }}
          >
            <Calendar size={18} />
            Schedule Future Use
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px', contentVisibility: 'auto' }}>
        {/* Main Grid: Left Side for Cars, Right Side for Bookings (desktop side-by-side) */}
        <div className="layout-2col">
          
          {/* Cars status column */}
          <div>
            <h2 className="section-title">Family Fleet Status</h2>
            <div className="grid-3">
              {data?.cars.map(({ car, status, current_booking, allowed_drivers }) => {
                const isCurrentUserDriver = current_booking?.user_id === user?.id;
                
                return (
                  <div key={car.id} className="glass-panel" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '0',
                    overflow: 'hidden',
                    position: 'relative',
                    border: status === 'in_use' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--panel-border)'
                  }}>
                    {/* Car Image Area */}
                    <div style={{
                      height: '160px',
                      background: car.photo_url.startsWith('data:image/') || car.photo_url.startsWith('http')
                        ? 'none'
                        : getPresetColor(car.name),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {car.photo_url.startsWith('data:image/') || car.photo_url.startsWith('http') ? (
                        <img
                          src={car.photo_url}
                          alt={car.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <CarIcon size={64} color="rgba(255,255,255,0.7)" />
                      )}

                      {/* Status Overlay Badge */}
                      <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                        <span className={`badge ${status === 'available' ? 'badge-success' : 'badge-warning'}`}>
                          {status === 'available' ? 'Available' : 'In Use'}
                        </span>
                      </div>
                      
                      {/* Priority Star Badge */}
                      <div style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        display: 'flex',
                        gap: '2px',
                        alignItems: 'center'
                      }}>
                        {Array.from({ length: car.priority }).map((_, i) => (
                          <Star key={i} size={12} fill="var(--warning)" color="var(--warning)" />
                        ))}
                      </div>
                    </div>

                    {/* Car Details Content */}
                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h3 className="card-title" style={{ marginBottom: '2px' }}>{car.name}</h3>
                      <p style={{
                        fontFamily: 'monospace',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        letterSpacing: '1px',
                        background: 'rgba(255,255,255,0.04)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        alignSelf: 'flex-start',
                        marginBottom: '16px'
                      }}>
                        {car.license_plate}
                      </p>

                      {/* Status Info details */}
                      {status === 'in_use' && current_booking ? (
                        <div style={{
                          background: 'rgba(245, 158, 11, 0.08)',
                          padding: '12px',
                          borderRadius: 'var(--border-radius-sm)',
                          fontSize: '14px',
                          border: '1px solid rgba(245, 158, 11, 0.15)',
                          marginBottom: '16px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontWeight: 500 }}>
                            <User size={14} />
                            <span>Driver: {current_booking.user?.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            <Clock size={14} />
                            <span>Until {formatTime(current_booking.end_time)}</span>
                          </div>
                          {current_booking.purpose && (
                            <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              "{current_booking.purpose}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <div style={{
                          background: 'rgba(16, 185, 129, 0.08)',
                          padding: '12px',
                          borderRadius: 'var(--border-radius-sm)',
                          fontSize: '14px',
                          border: '1px solid rgba(16, 185, 129, 0.15)',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: 'var(--success)'
                        }}>
                          <CheckCircle size={14} />
                          <span>Ready for pickup</span>
                        </div>
                      )}

                      {/* Drivers allowed list */}
                      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--panel-border)', paddingTop: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                          Allowed Drivers:
                        </span>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {allowed_drivers.map((driver) => (
                            <span
                              key={driver.id}
                              title={driver.name}
                              style={{
                                fontSize: '11px',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid var(--panel-border)',
                                color: 'var(--text-secondary)',
                                padding: '2px 8px',
                                borderRadius: '4px'
                              }}
                            >
                              {driver.name.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      {status === 'in_use' && isCurrentUserDriver && (
                        <button
                          onClick={() => returnCarMutation.mutate(current_booking!.id)}
                          className="btn btn-primary"
                          disabled={returnCarMutation.isPending}
                          style={{ marginTop: '16px', width: '100%', padding: '10px' }}
                        >
                          {returnCarMutation.isPending ? 'Ending trip...' : 'Return Car'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {data?.cars.length === 0 && (
                <div className="glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                  <AlertCircle size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>No cars have been added to your family yet.</p>
                  {user?.role === 'manager' && (
                    <button
                      onClick={() => navigate('/admin')}
                      className="btn btn-primary animate-fade-in"
                      style={{ marginTop: '16px' }}
                    >
                      <Plus size={16} />
                      Add your first car
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Upcoming Bookings timeline */}
          <div>
            <h2 className="section-title">Future Bookings</h2>
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '550px', overflowY: 'auto' }}>
              {data?.upcoming_bookings.map((booking) => {
                const isOwner = booking.user_id === user?.id;
                
                return (
                  <div
                    key={booking.id}
                    style={{
                      padding: '16px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid var(--panel-border)',
                      borderRadius: 'var(--border-radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          background: 'var(--primary-gradient)',
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <CarIcon size={14} color="#fff" />
                        </div>
                        <span style={{ fontWeight: 600 }}>{booking.car?.name}</span>
                      </div>
                      <span className={`badge ${booking.status === 'active' ? 'badge-warning' : 'badge-primary'}`}>
                        {booking.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={12} />
                        <span>Driver: {booking.user?.name} {isOwner && '(You)'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <Clock size={12} />
                        <span>
                          {formatDate(booking.start_time)} • {formatTime(booking.start_time)}
                          <ArrowRight size={10} style={{ margin: '0 4px', verticalAlign: 'middle' }} />
                          {formatTime(booking.end_time)}
                        </span>
                      </div>
                      {booking.purpose && (
                        <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', fontStyle: 'italic', fontSize: '12px' }}>
                          Purpose: "{booking.purpose}"
                        </div>
                      )}
                    </div>

                    {(isOwner || user?.role === 'manager') && (
                      <button
                        onClick={() => cancelBookingMutation.mutate(booking.id)}
                        className="btn btn-outline"
                        disabled={cancelBookingMutation.isPending}
                        style={{
                          width: '100%',
                          padding: '6px',
                          fontSize: '12px',
                          marginTop: '4px',
                          borderColor: 'rgba(239, 68, 68, 0.2)',
                          color: 'var(--danger)'
                        }}
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>
                );
              })}
              {data?.upcoming_bookings.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                  <Calendar size={36} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  <p style={{ fontSize: '14px' }}>No upcoming uses scheduled</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
