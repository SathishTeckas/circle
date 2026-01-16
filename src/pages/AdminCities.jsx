import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, Trash2, Edit, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminCities() {
  const [user, setUser] = useState(null);
  const [editingCity, setEditingCity] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [cityName, setCityName] = useState('');
  const [areas, setAreas] = useState(['']);
  const [newArea, setNewArea] = useState('');

  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.role !== 'admin') {
        window.location.href = '/';
      }
      setUser(u);
    });
  }, []);

  const { data: cities = [], isLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: () => base44.entities.City.list('display_order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.City.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.City.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.City.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    },
  });

  const openDialog = (city = null) => {
    if (city) {
      setEditingCity(city);
      setCityName(city.name);
      setAreas(city.areas || ['']);
    } else {
      setEditingCity(null);
      setCityName('');
      setAreas(['']);
    }
    setNewArea('');
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingCity(null);
    setCityName('');
    setAreas(['']);
    setNewArea('');
  };

  const handleSave = () => {
    const filteredAreas = areas.filter(a => a.trim());
    
    if (!cityName.trim() || filteredAreas.length === 0) {
      alert('Please provide a city name and at least one area');
      return;
    }

    const data = {
      name: cityName.trim(),
      areas: filteredAreas,
      is_active: true,
      display_order: editingCity?.display_order ?? cities.length,
    };

    if (editingCity) {
      updateMutation.mutate({ id: editingCity.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this city? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (city) => {
    updateMutation.mutate({
      id: city.id,
      data: { ...city, is_active: !city.is_active },
    });
  };

  const handleMoveOrder = (city, direction) => {
    const currentIndex = cities.findIndex(c => c.id === city.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= cities.length) return;

    const targetCity = cities[targetIndex];
    
    updateMutation.mutate({
      id: city.id,
      data: { ...city, display_order: targetCity.display_order },
    });
    
    updateMutation.mutate({
      id: targetCity.id,
      data: { ...targetCity, display_order: city.display_order },
    });
  };

  const addArea = () => {
    if (newArea.trim()) {
      setAreas([...areas, newArea.trim()]);
      setNewArea('');
    }
  };

  const removeArea = (index) => {
    setAreas(areas.filter((_, i) => i !== index));
  };

  const updateArea = (index, value) => {
    const updated = [...areas];
    updated[index] = value;
    setAreas(updated);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">City & Area Management</h1>
            <p className="text-slate-600 mt-1">Manage cities and their areas across the entire app</p>
          </div>
          <Button onClick={() => openDialog()} className="bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4 mr-2" />
            Add City
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Cities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{cities.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Active Cities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {cities.filter(c => c.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {cities.reduce((sum, c) => sum + (c.areas?.length || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cities List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : cities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600">No cities added yet. Add your first city to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {cities.map((city, index) => (
              <Card key={city.id} className={cn(!city.is_active && 'opacity-50')}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <MapPin className="w-5 h-5 text-violet-600 flex-shrink-0" />
                        <h3 className="text-lg md:text-xl font-semibold text-slate-900">{city.name}</h3>
                        <Badge variant={city.is_active ? 'default' : 'secondary'}>
                          {city.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {city.areas?.map((area, i) => (
                          <Badge key={i} variant="outline" className="text-xs md:text-sm text-slate-600">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex flex-col gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleMoveOrder(city, 'up')}
                          disabled={index === 0}
                          className="h-6 w-6"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleMoveOrder(city, 'down')}
                          disabled={index === cities.length - 1}
                          className="h-6 w-6"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant={city.is_active ? 'outline' : 'default'}
                        onClick={() => handleToggleActive(city)}
                        className="hidden md:flex"
                      >
                        {city.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant={city.is_active ? 'outline' : 'default'}
                        onClick={() => handleToggleActive(city)}
                        className="md:hidden"
                      >
                        {city.is_active ? 'Hide' : 'Show'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openDialog(city)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(city.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCity ? 'Edit City' : 'Add New City'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  City Name
                </label>
                <Input
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  placeholder="Enter city name"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Areas
                </label>
                <div className="space-y-3">
                  {areas.map((area, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={area}
                        onChange={(e) => updateArea(index, e.target.value)}
                        placeholder="Enter area name"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeArea(index)}
                        disabled={areas.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex gap-2">
                    <Input
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value)}
                      placeholder="Add another area"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addArea();
                        }
                      }}
                    />
                    <Button variant="outline" onClick={addArea}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}