import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { storage } from '@/lib/storage';

interface Strategy {
  id: string;
  name: string;
  description: string;
  checklist: string[];
  createdAt: number;
}

const StrategiesPage = () => {
  const { features } = useSubscription();
  const [strategies, setStrategies] = useState<Strategy[]>(() => {
    return storage.get<Strategy[]>('strategies', []);
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    checklist: ''
  });

  const canAddMore = features.customStrategies === -1 || strategies.length < features.customStrategies;

  const handleSave = () => {
    const checklistItems = formData.checklist
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    if (editingId) {
      // Update existing
      setStrategies(prev => prev.map(s =>
        s.id === editingId
          ? { ...s, name: formData.name, description: formData.description, checklist: checklistItems }
          : s
      ));
    } else {
      // Create new
      const newStrategy: Strategy = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        checklist: checklistItems,
        createdAt: Date.now()
      };
      setStrategies(prev => [...prev, newStrategy]);
    }

    storage.set('strategies', strategies);
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (strategy: Strategy) => {
    setEditingId(strategy.id);
    setFormData({
      name: strategy.name,
      description: strategy.description,
      checklist: strategy.checklist.join('\n')
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setStrategies(prev => prev.filter(s => s.id !== id));
    storage.set('strategies', strategies.filter(s => s.id !== id));
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', checklist: '' });
    setEditingId(null);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Strategies</h1>
            <p className="text-muted-foreground mt-1">Manage your trading strategies and checklists</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button disabled={!canAddMore}>
                <Plus className="w-4 h-4 mr-2" />
                New Strategy
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0a0e17] border-[#1a2332]">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingId ? 'Edit Strategy' : 'Create Strategy'}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Define your trading strategy with entry/exit rules and checklist.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white mb-1 block">Strategy Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Trend Following Breakout"
                    className="bg-[#050810] border-[#1a2332]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-white mb-1 block">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your strategy approach..."
                    rows={3}
                    className="bg-[#050810] border-[#1a2332]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-white mb-1 block">
                    Checklist (one item per line)
                  </label>
                  <Textarea
                    value={formData.checklist}
                    onChange={(e) => setFormData({ ...formData, checklist: e.target.value })}
                    placeholder="• Trend is clearly defined&#10;• Wait for pullback to EMA&#10;• Enter on breakout&#10;• Set SL below recent low"
                    rows={6}
                    className="bg-[#050810] border-[#1a2332]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={!formData.name.trim()}>
                    {editingId ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!canAddMore && (
          <Card className="bg-amber-500/10 border-amber-500/20 mb-6">
            <CardContent className="p-4">
              <p className="text-amber-400 text-sm">
                You've reached the maximum number of strategies ({features.customStrategies}). Upgrade to Pro for unlimited strategies.
              </p>
            </CardContent>
          </Card>
        )}

        {strategies.length === 0 ? (
          <Card className="bg-[#0a0e17] border-[#1a2332]">
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No strategies yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first trading strategy to organize your trading approach.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Strategy
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.map((strategy) => (
              <Card key={strategy.id} className="bg-[#0a0e17] border-[#1a2332]">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-white text-lg">{strategy.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(strategy)}
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(strategy.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{strategy.description}</p>
                  {strategy.checklist.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Checklist</h4>
                      <ul className="space-y-1">
                        {strategy.checklist.map((item, idx) => (
                          <li key={idx} className="text-xs text-white flex items-start gap-2">
                            <span className="text-blue-400">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategiesPage;
