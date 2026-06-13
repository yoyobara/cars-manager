import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Car as CarIcon, ArrowLeft, AlertCircle, Star, Check, Calendar } from 'lucide-react';

interface CarResponse {
  id: string;
  name: string;
  license_plate: string;
  photo_url: string;
  priority: number;
  family_id: string;
}

export const ScheduleBooking: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Date and Time inputs (local string values like 'YYYY-MM-DDTHH:MM')
  const [startTimeLocal, setStartTimeLocal] = useState<string>('');
  const [endTimeLocal, setEndTimeLocal] = useState<string>('');

  const [selectedCarId, setSelectedCarId] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Convert local date strings to ISO format for querying
  const startISO = startTimeLocal ? new Date(startTimeLocal).toISOString() : '';
  const endISO = endTimeLocal ? new Date(endTimeLocal).toISOString() : '';

  // Fetch available cars for the selected time window
  const { data: availableCars, isLoading, refetch } = useQuery<CarResponse[]>({
    queryKey: ['availableCarsSchedule', startISO, endISO],
    queryFn: async () => {
      if (!startISO || !endISO) return [];
      const response = await apiClient.get<CarResponse[]>('/cars/available', {
        params: {
          start_time: startISO,
          end_time: endISO,
        },
      });
      return response.data;
    },
    enabled: !!startISO && !!endISO && new Date(startISO) < new Date(endISO),
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/bookings/', {
        car_id: selectedCarId,
        start_time: startISO,
        end_time: endISO,
        purpose: purpose.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/');
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to schedule booking');
    },
  });

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!startTimeLocal || !endTimeLocal) {
      setError('Please select start and end times');
      return;
    }

    if (new Date(startTimeLocal) >= new Date(endTimeLocal)) {
      setError('Start time must be before end time');
      return;
    }

    if (!selectedCarId) {
      setError('Please select a car to reserve');
      return;
    }

    scheduleMutation.mutate();
  };

  const getPresetColor = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    ];
    return colors[hash % colors.length];
  };

  const hasSelectedRange = !!startTimeLocal && !!endTimeLocal && new Date(startTimeLocal) < new Date(endTimeLocal);

  return (
    <div className="app-container animate-fade-in" style={{ maxWidth: '600px' }}>
      <button onClick={() => navigate('/')} className="btn btn-outline" style={{ marginBottom: '24px', padding: '8px 16px' }}>
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      <div className="glass-panel">
        <h2 className="section-title">Schedule Future Use</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px' }}>
          Select your booking slot to view available cars and get recommendations.
        </p>

        {error && (
          <div className="badge-danger" style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', width: '100%', textTransform: 'none' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSchedule}>
          {/* Time slot picker */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label className="form-label">Start Date & Time</label>
              <input
                type="datetime-local"
                className="form-input"
                required
                value={startTimeLocal}
                onChange={(e) => {
                  setStartTimeLocal(e.target.value);
                  setSelectedCarId(''); // Reset selected car on date change
                }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label className="form-label">End Date & Time</label>
              <input
                type="datetime-local"
                className="form-input"
                required
                value={endTimeLocal}
                onChange={(e) => {
                  setEndTimeLocal(e.target.value);
                  setSelectedCarId(''); // Reset selected car on date change
                }}
              />
            </div>
          </div>

          {/* Available Cars List (loads dynamically when range is valid) */}
          {hasSelectedRange ? (
            <div className="form-group" style={{ marginTop: '24px' }}>
              <label className="form-label">Available Cars</label>
              {isLoading ? (
                <p style={{ color: 'var(--text-secondary)' }}>Checking fleet availability...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {availableCars?.map((car, index) => {
                    const isSelected = selectedCarId === car.id;
                    return (
                      <div
                        key={car.id}
                        onClick={() => setSelectedCarId(car.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px',
                          background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'rgba(0,0,0,0.25)',
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--panel-border)'}`,
                          borderRadius: 'var(--border-radius-sm)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '8px',
                            background: car.photo_url.startsWith('data:image/') || car.photo_url.startsWith('http')
                              ? 'none'
                              : getPresetColor(car.name),
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {car.photo_url.startsWith('data:image/') || car.photo_url.startsWith('http') ? (
                              <img src={car.photo_url} alt={car.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <CarIcon size={24} color="#fff" />
                            )}
                          </div>

                          <div>
                            <h4 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {car.name}
                              {index === 0 && (
                                <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 8px' }}>
                                  Recommended
                                </span>
                              )}
                            </h4>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                              {car.license_plate}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {Array.from({ length: car.priority }).map((_, i) => (
                              <Star key={i} size={12} fill="var(--warning)" color="var(--warning)" />
                            ))}
                          </div>
                          {isSelected && (
                            <div style={{
                              background: 'var(--primary)',
                              borderRadius: '999px',
                              padding: '4px',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {availableCars?.length === 0 && (
                    <div style={{ padding: '24px', background: 'rgba(0,0,0,0.15)', border: '1px dashed var(--panel-border)', borderRadius: 'var(--border-radius-sm)', textAlign: 'center' }}>
                      <AlertCircle size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        No cars are available in this time range. Try adjusting your times.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              margin: '36px 0',
              padding: '24px',
              border: '1px dashed var(--panel-border)',
              borderRadius: 'var(--border-radius-sm)',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              <Calendar size={36} style={{ margin: '0 auto 12px auto', display: 'block', color: 'var(--text-muted)' }} />
              <p style={{ fontSize: '14px' }}>Please select a valid time range above to check car availability.</p>
            </div>
          )}

          {/* Purpose */}
          <div className="form-group" style={{ marginTop: '24px' }}>
            <label className="form-label">Purpose of Booking</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Taking family to airport, roadtrip"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              disabled={!hasSelectedRange}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={scheduleMutation.isPending || !selectedCarId}
            style={{ width: '100%', marginTop: '20px', padding: '14px' }}
          >
            {scheduleMutation.isPending ? 'Scheduling...' : 'Reserve Selected Car'}
          </button>
        </form>
      </div>
    </div>
  );
};
