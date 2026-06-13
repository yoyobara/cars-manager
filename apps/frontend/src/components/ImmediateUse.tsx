import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Car as CarIcon, Clock, Star, ArrowLeft, AlertCircle, Check } from 'lucide-react';

interface CarResponse {
  id: string;
  name: string;
  license_plate: string;
  photo_url: string;
  priority: number;
  family_id: string;
}

export const ImmediateUse: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedCarId, setSelectedCarId] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [purpose, setPurpose] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch available cars (immediate use has no query dates, falls back to now -> now + 2h in API)
  const { data: availableCars, isLoading } = useQuery<CarResponse[]>({
    queryKey: ['availableCarsImmediate'],
    queryFn: async () => {
      const response = await apiClient.get<CarResponse[]>('/cars/available');
      return response.data;
    },
  });

  const useCarMutation = useMutation({
    mutationFn: async () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

      await apiClient.post('/bookings/', {
        car_id: selectedCarId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        purpose: purpose.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/');
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to start trip');
    },
  });

  const handleStartTrip = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedCarId) {
      setError('Please select a car to drive');
      return;
    }
    useCarMutation.mutate();
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

  return (
    <div className="app-container animate-fade-in" style={{ maxWidth: '600px' }}>
      <button onClick={() => navigate('/')} className="btn btn-outline" style={{ marginBottom: '24px', padding: '8px 16px' }}>
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      <div className="glass-panel">
        <h2 className="section-title">Use Car Immediately</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px' }}>
          Select from available cars you are authorized to drive. They are ranked by priority (best cars first).
        </p>

        {error && (
          <div className="badge-danger" style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', width: '100%', textTransform: 'none' }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading available cars...</p>
        ) : (
          <form onSubmit={handleStartTrip}>
            {/* Cars List */}
            <div className="form-group">
              <label className="form-label">Select Car</label>
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
                        {/* Car Thumbnail Fallback */}
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
                        {/* Priority Stars */}
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
                      No cars are currently available or allowed for you.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Trip Duration */}
            <div className="form-group" style={{ marginTop: '24px' }}>
              <label className="form-label">Trip Duration</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[30, 60, 120, 240].map((mins) => {
                  const isDurSelected = durationMinutes === mins;
                  const label = mins >= 60 ? `${mins / 60} hr${mins > 60 ? 's' : ''}` : `${mins} mins`;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      style={{
                        padding: '12px 8px',
                        background: isDurSelected ? 'var(--primary-gradient)' : 'rgba(0,0,0,0.2)',
                        border: `1px solid ${isDurSelected ? 'var(--primary)' : 'var(--panel-border)'}`,
                        borderRadius: 'var(--border-radius-sm)',
                        color: isDurSelected ? '#fff' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Purpose */}
            <div className="form-group">
              <label className="form-label">Purpose (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Grocery shopping, picking up kids"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={useCarMutation.isPending || availableCars?.length === 0}
              style={{ width: '100%', marginTop: '16px', padding: '14px' }}
            >
              {useCarMutation.isPending ? 'Starting trip...' : 'Start Trip Now'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
