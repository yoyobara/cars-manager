import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  Car as CarIcon,
  User,
  Star,
  Upload,
  AlertCircle
} from 'lucide-react';

interface CarResponse {
  id: string;
  name: string;
  license_plate: string;
  photo_url: string;
  priority: number;
  family_id: string;
}

interface MemberResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  allowed_car_ids: string[];
}

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Car Form State
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [carName, setCarName] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [carPriority, setCarPriority] = useState<number>(3);
  const [carPhoto, setCarPhoto] = useState(''); // Holds base64 string or URL
  const [photoType, setPhotoType] = useState<'url' | 'upload'>('url');

  // Queries
  const { data: cars, isLoading: loadingCars } = useQuery<CarResponse[]>({
    queryKey: ['adminCars'],
    queryFn: async () => {
      const response = await apiClient.get<CarResponse[]>('/cars/');
      return response.data;
    },
  });

  const { data: members, isLoading: loadingMembers } = useQuery<MemberResponse[]>({
    queryKey: ['adminMembers'],
    queryFn: async () => {
      const response = await apiClient.get<MemberResponse[]>('/family/members');
      return response.data;
    },
  });

  // Fetch family info to get the invite code
  // In schemas/api, the user object contains family_id. We can get family info by fetching members, or let's look:
  // Is there a family info endpoint? Let's check.
  // Wait, does the user object have family invite code?
  // Let's see: in `auth.py`, registration returns token. `/auth/me` returns `UserResponse` which has `family_id`.
  // Wait, let's add a quick endpoint `/family/invite-code` or get the code from members list if possible, or wait!
  // In `FamilyResponse` schema there is `invite_code`. Let's create an endpoint in the family router, or wait,
  // we can fetch family details `/family/`? Wait, let's fetch members and print the code?
  // No, members don't have the family invite code.
  // Wait, is there a family repository method to get family? Yes: `family_repo.get_by_id(family_id)`.
  // Let's look at `apps/backend/app/routers/family.py`. It does NOT have a GET `/` family detail route!
  // Oh! Let's quickly add a route `GET /` to `apps/backend/app/routers/family.py` which returns the family details (including invite code).
  // Wait, let's write `AdminPanel.tsx` assuming we have `GET /api/family/` which returns `{ id, name, invite_code }`.
  // I will define the API call, and then I will update `family.py` in the backend to support it. This is a very clean integration step!

  const { data: familyInfo } = useQuery<{ id: string; name: string; invite_code: string }>({
    queryKey: ['familyInfo'],
    queryFn: async () => {
      const response = await apiClient.get('/family/info');
      return response.data;
    },
  });

  // Car Mutations
  const saveCarMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: carName.trim(),
        license_plate: carPlate.trim(),
        photo_url: carPhoto.trim() || 'placeholder',
        priority: carPriority,
      };

      if (editingCarId) {
        await apiClient.put(`/cars/${editingCarId}`, payload);
      } else {
        await apiClient.post('/cars/', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCars'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      resetCarForm();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to save car');
    },
  });

  const deleteCarMutation = useMutation({
    mutationFn: async (carId: string) => {
      await apiClient.delete(`/cars/${carId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCars'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to delete car');
    },
  });

  // Permissions Mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ memberId, allowedCarIds }: { memberId: string; allowedCarIds: string[] }) => {
      await apiClient.put(`/family/members/${memberId}/permissions`, {
        allowed_car_ids: allowedCarIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMembers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const resetCarForm = () => {
    setEditingCarId(null);
    setCarName('');
    setCarPlate('');
    setCarPriority(3);
    setCarPhoto('');
    setError(null);
  };

  const handleEditClick = (car: CarResponse) => {
    setEditingCarId(car.id);
    setCarName(car.name);
    setCarPlate(car.license_plate);
    setCarPriority(car.priority);
    setCarPhoto(car.photo_url);
    if (car.photo_url.startsWith('data:image/')) {
      setPhotoType('upload');
    } else {
      setPhotoType('url');
    }
  };

  const handleCopyCode = () => {
    if (familyInfo?.invite_code) {
      navigator.clipboard.writeText(familyInfo.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle image upload conversions to Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image file is too large. Max size is 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCarPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePermissionChange = (member: MemberResponse, carId: string, checked: boolean) => {
    let newAllowedIds = [...member.allowed_car_ids];
    if (checked) {
      if (!newAllowedIds.includes(carId)) {
        newAllowedIds.push(carId);
      }
    } else {
      newAllowedIds = newAllowedIds.filter((id) => id !== carId);
    }
    updatePermissionsMutation.mutate({
      memberId: member.id,
      allowedCarIds: newAllowedIds,
    });
  };

  if (user?.role !== 'manager') {
    return (
      <div className="app-container" style={{ textAlign: 'center', marginTop: '100px' }}>
        <div className="badge-danger" style={{ padding: '16px 24px', fontSize: '18px' }}>
          Access Denied: Only family managers can access this page.
        </div>
        <button onClick={() => navigate('/')} className="btn btn-outline" style={{ marginTop: '20px' }}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="app-container animate-fade-in">
      <button onClick={() => navigate('/')} className="btn btn-outline" style={{ marginBottom: '24px', padding: '8px 16px' }}>
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      {/* Family Info Panel */}
      <div className="glass-panel" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{familyInfo?.name || 'Family Management'}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              Invite family members using the code below. They can sign up and enter this code to join your fleet.
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid var(--panel-border)',
            borderRadius: 'var(--border-radius-sm)',
            padding: '8px 16px',
            gap: '12px'
          }}>
            <div>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>
                Family Invite Code
              </span>
              <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '1px', color: 'var(--secondary)' }}>
                {familyInfo?.invite_code || 'Loading...'}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="btn btn-outline"
              style={{ padding: '8px', borderRadius: '6px' }}
              title="Copy Code"
            >
              {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="badge-danger" style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', width: '100%', textTransform: 'none' }}>
          {error}
        </div>
      )}

      {/* Grid: Left Side Manage Fleet, Right Side Manage Permissions */}
      <div className="layout-2col-wide">
        
        {/* fleet Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Car form */}
          <div className="glass-panel">
            <h3 className="section-title" style={{ borderLeftColor: 'var(--secondary)' }}>
              {editingCarId ? 'Edit Fleet Car' : 'Add New Car'}
            </h3>
            
            <form onSubmit={(e) => { e.preventDefault(); saveCarMutation.mutate(); }}>
              <div className="form-group">
                <label className="form-label">Car Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Tesla Model Y, Family SUV"
                  required
                  value={carName}
                  onChange={(e) => setCarName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">License Plate Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. TX-12345"
                  required
                  value={carPlate}
                  onChange={(e) => setCarPlate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Priority Rank (1 = Standard, 5 = Premium)</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[1, 2, 3, 4, 5].map((stars) => {
                    const isActive = carPriority >= stars;
                    return (
                      <button
                        type="button"
                        key={stars}
                        onClick={() => setCarPriority(stars)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <Star
                          size={24}
                          fill={isActive ? 'var(--warning)' : 'none'}
                          color={isActive ? 'var(--warning)' : 'var(--text-muted)'}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Photo Options */}
              <div className="form-group">
                <label className="form-label">Car Photo</label>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => { setPhotoType('url'); setCarPhoto(''); }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: photoType === 'url' ? 'var(--primary)' : 'rgba(0,0,0,0.2)',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    Image URL
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPhotoType('upload'); setCarPhoto(''); }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: photoType === 'upload' ? 'var(--primary)' : 'rgba(0,0,0,0.2)',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    Upload File
                  </button>
                </div>

                {photoType === 'url' ? (
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://example.com/car-photo.jpg"
                    value={carPhoto}
                    onChange={(e) => setCarPhoto(e.target.value)}
                  />
                ) : (
                  <div style={{
                    position: 'relative',
                    border: '1px dashed var(--panel-border)',
                    borderRadius: 'var(--border-radius-sm)',
                    padding: '24px',
                    textAlign: 'center',
                    background: 'rgba(0,0,0,0.15)'
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                    <Upload size={24} style={{ margin: '0 auto 8px auto', display: 'block', color: 'var(--text-secondary)' }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {carPhoto ? 'Image Selected (click to replace)' : 'Drag and drop or click to upload'}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {saveCarMutation.isPending ? 'Saving...' : editingCarId ? 'Update Car' : 'Add Car'}
                </button>
                {editingCarId && (
                  <button type="button" onClick={resetCarForm} className="btn btn-outline">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Cars List */}
          <div className="glass-panel">
            <h3 className="section-title">Current Fleet ({cars?.length || 0})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cars?.map((car) => (
                <div
                  key={car.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: 'var(--border-radius-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      {car.photo_url.startsWith('data:image/') || car.photo_url.startsWith('http') ? (
                        <img src={car.photo_url} alt={car.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <CarIcon size={18} color="var(--text-secondary)" />
                      )}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '15px', display: 'block' }}>{car.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {car.license_plate}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleEditClick(car)}
                      className="btn btn-outline"
                      style={{ padding: '6px', borderRadius: '4px' }}
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${car.name}?`)) {
                          deleteCarMutation.mutate(car.id);
                        }
                      }}
                      className="btn btn-outline"
                      style={{ padding: '6px', borderRadius: '4px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                      title="Delete"
                      disabled={deleteCarMutation.isPending}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {cars?.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>
                  No cars added yet. Use the form above to add your first car.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Member Permissions Column */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 className="section-title">Driver Permissions</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
            Check the boxes below to authorize which cars family members are allowed to drive.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {members?.map((member) => (
              <div
                key={member.id}
                style={{
                  padding: '16px',
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: 'var(--border-radius-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{
                    background: 'var(--primary)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <User size={16} color="#fff" />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, display: 'block' }}>
                      {member.name} {member.id === user?.id && '(You)'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {member.email} • {member.role}
                    </span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  borderTop: '1px solid var(--panel-border)',
                  paddingTop: '12px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Allowed Cars:
                  </span>
                  
                  {cars?.map((car) => {
                    const isChecked = member.allowed_car_ids.includes(car.id);
                    const isDisabled = member.role === 'manager'; // Managers get access to all cars by default

                    return (
                      <label
                        key={car.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '14px',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.7 : 1
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isDisabled || isChecked}
                          disabled={isDisabled}
                          onChange={(e) => handlePermissionChange(member, car.id, e.target.checked)}
                          style={{
                            accentColor: 'var(--primary)',
                            width: '16px',
                            height: '16px'
                          }}
                        />
                        <span>{car.name}</span>
                        {isDisabled && (
                          <span className="badge badge-primary" style={{ fontSize: '9px', padding: '1px 6px' }}>
                            Manager
                          </span>
                        )}
                      </label>
                    );
                  })}
                  {cars?.length === 0 && (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Add cars to configure permissions.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
