import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  X,
  ChevronDown,
  ChevronRight,
  Calendar,
  User,
  Monitor,
  Activity
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function AdminErrors() {
  const [user, setUser] = useState(null);
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('new');
  const [expandedError, setExpandedError] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedError, setSelectedError] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: errors = [], isLoading } = useQuery({
    queryKey: ['error-logs', selectedSeverity, selectedStatus],
    queryFn: async () => {
      const query = {};
      if (selectedSeverity !== 'all') query.severity = selectedSeverity;
      if (selectedStatus !== 'all') query.status = selectedStatus;
      return await base44.entities.ErrorLog.filter(query, '-created_date', 100);
    },
    enabled: !!user
  });

  const updateErrorMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.ErrorLog.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      setDetailsOpen(false);
    }
  });

  const handleStatusChange = (error, newStatus) => {
    updateErrorMutation.mutate({
      id: error.id,
      data: {
        status: newStatus,
        ...(newStatus === 'resolved' && {
          resolved_by: user?.email,
          resolved_date: new Date().toISOString()
        })
      }
    });
  };

  const handleSaveNotes = () => {
    if (!selectedError) return;
    updateErrorMutation.mutate({
      id: selectedError.id,
      data: { admin_notes: adminNotes }
    });
  };

  const severityConfig = {
    low: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    medium: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    high: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
    critical: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
  };

  const statusConfig = {
    new: { label: 'New', color: 'bg-red-100 text-red-700' },
    investigating: { label: 'Investigating', color: 'bg-yellow-100 text-yellow-700' },
    resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
    ignored: { label: 'Ignored', color: 'bg-slate-100 text-slate-600' }
  };

  const errorsByDate = React.useMemo(() => {
    const grouped = {};
    errors.forEach(error => {
      const date = new Date(error.created_date).toLocaleDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(error);
    });
    return grouped;
  }, [errors]);

  if (!user) return null;

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-slate-600">Admin access required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Error Logs</h1>
          <p className="text-slate-600 mt-1">Monitor and manage application errors</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['low', 'medium', 'high', 'critical'].map(severity => {
            const count = errors.filter(e => e.severity === severity).length;
            const config = severityConfig[severity];
            return (
              <Card key={severity} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedSeverity(severity)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <config.icon className={cn("w-5 h-5", config.color)} />
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{count}</p>
                      <p className="text-xs text-slate-600 capitalize">{severity}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-2">
                <Badge 
                  className={cn("cursor-pointer", selectedSeverity === 'all' ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-700')}
                  onClick={() => setSelectedSeverity('all')}
                >
                  All Severity
                </Badge>
                {['low', 'medium', 'high', 'critical'].map(severity => (
                  <Badge 
                    key={severity}
                    className={cn("cursor-pointer capitalize", selectedSeverity === severity ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-700')}
                    onClick={() => setSelectedSeverity(severity)}
                  >
                    {severity}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 border-l pl-2">
                {['all', 'new', 'investigating', 'resolved', 'ignored'].map(status => (
                  <Badge 
                    key={status}
                    className={cn("cursor-pointer capitalize", selectedStatus === status ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-700')}
                    onClick={() => setSelectedStatus(status)}
                  >
                    {status}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : Object.keys(errorsByDate).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <p className="text-slate-600">No errors found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(errorsByDate).map(([date, dateErrors]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-slate-600 mb-2">{date}</h3>
                <div className="space-y-2">
                  {dateErrors.map(error => {
                    const config = severityConfig[error.severity];
                    const isExpanded = expandedError === error.id;
                    return (
                      <Card key={error.id} className={cn("border-l-4", config.border)}>
                        <CardContent className="p-4">
                          <div 
                            className="flex items-start gap-3 cursor-pointer"
                            onClick={() => setExpandedError(isExpanded ? null : error.id)}
                          >
                            <config.icon className={cn("w-5 h-5 mt-0.5", config.color)} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900 break-words">{error.error_message}</p>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <Monitor className="w-3 h-3" />
                                      {error.page || 'Unknown page'}
                                    </span>
                                    {error.user_email && (
                                      <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {error.user_email}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(error.created_date).toLocaleTimeString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={statusConfig[error.status].color}>
                                    {statusConfig[error.status].label}
                                  </Badge>
                                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="space-y-3 mt-4 pt-4 border-t">
                                  {error.action && (
                                    <div>
                                      <p className="text-xs font-medium text-slate-600 mb-1">Action:</p>
                                      <p className="text-sm text-slate-700">{error.action}</p>
                                    </div>
                                  )}
                                  {error.error_stack && (
                                    <div>
                                      <p className="text-xs font-medium text-slate-600 mb-1">Stack Trace:</p>
                                      <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded overflow-x-auto">
                                        {error.error_stack}
                                      </pre>
                                    </div>
                                  )}
                                  {error.admin_notes && (
                                    <div>
                                      <p className="text-xs font-medium text-slate-600 mb-1">Admin Notes:</p>
                                      <p className="text-sm text-slate-700">{error.admin_notes}</p>
                                    </div>
                                  )}
                                  <div className="flex gap-2 pt-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedError(error);
                                        setAdminNotes(error.admin_notes || '');
                                        setDetailsOpen(true);
                                      }}
                                    >
                                      Add Notes
                                    </Button>
                                    {error.status !== 'investigating' && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(error, 'investigating');
                                        }}
                                      >
                                        Mark Investigating
                                      </Button>
                                    )}
                                    {error.status !== 'resolved' && (
                                      <Button 
                                        size="sm" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(error, 'resolved');
                                        }}
                                      >
                                        Mark Resolved
                                      </Button>
                                    )}
                                    {error.status !== 'ignored' && (
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(error, 'ignored');
                                        }}
                                      >
                                        Ignore
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Admin Notes</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this error..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}