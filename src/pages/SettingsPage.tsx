import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { storage } from '@/lib/storage';
import { toast } from 'sonner';
import { User, Crown, Zap, RefreshCw } from 'lucide-react';

const SettingsPage = () => {
  const { subscription, features, isPro, setPlan, setProfile } = useSubscription();
  const [username, setUsername] = useState(subscription.username || '');
  const [defaultLotSize, setDefaultLotSize] = useState(() => storage.get<number>('default-lot-size', 1.0));
  const [defaultSLPips, setDefaultSLPips] = useState(() => storage.get<number>('default-sl-pips', 20));
  const [defaultTPPips, setDefaultTPPips] = useState(() => storage.get<number>('default-tp-pips', 40));
  const [soundEnabled, setSoundEnabled] = useState(() => storage.get<boolean>('sound-enabled', true));
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => storage.get<boolean>('notifications-enabled', true));

  const handleProfileSave = () => {
    setProfile(username);
    toast.success('Profil güncellendi');
  };

  const handleTradingDefaultsSave = () => {
    storage.set('default-lot-size', defaultLotSize);
    storage.set('default-sl-pips', defaultSLPips);
    storage.set('default-tp-pips', defaultTPPips);
    toast.success('İşlem varsayılanları kaydedildi');
  };

  const handleUpgradeToPro = () => {
    setPlan('pro');
    toast.success('Pro plana geçiş yapıldı!');
  };

  const handleDowngradeToFree = () => {
    if (confirm('Are you sure you want to downgrade to Free plan? You will lose Pro features.')) {
      setPlan('free');
      toast.success('Free plana geçiş yapıldı');
    }
  };

  const initials = username?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'TR';

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>

        {/* Profile Section */}
        <Card className="bg-[#0a0e17] border-[#1a2332] mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={subscription.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={isPro ? 'default' : 'secondary'}>
                    {isPro ? 'PRO' : 'FREE'}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator className="bg-[#1a2332]" />

            <div>
              <Label htmlFor="username" className="text-white">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="bg-[#050810] border-[#1a2332] mt-2"
              />
            </div>

            <Button onClick={handleProfileSave} className="w-full">
              Save Profile
            </Button>
          </CardContent>
        </Card>

        {/* Subscription Section */}
        <Card className="bg-[#0a0e17] border-[#1a2332] mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Subscription Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-lg ${isPro ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30' : 'bg-[#050810]'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {isPro ? <Crown className="w-5 h-5 text-purple-400" /> : <User className="w-5 h-5 text-muted-foreground" />}
                  <span className="text-lg font-semibold text-white">
                    {isPro ? 'Pro Plan' : 'Free Plan'}
                  </span>
                </div>
                <Badge variant={isPro ? 'default' : 'secondary'}>
                  {isPro ? 'ACTIVE' : 'FREE'}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Open Positions</span>
                  <span className="text-white">{features.maxOpenPositions === -1 ? 'Unlimited' : features.maxOpenPositions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Advanced Indicators</span>
                  <span className={features.advancedIndicators ? 'text-emerald-400' : 'text-muted-foreground'}>
                    {features.advancedIndicators ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custom Strategies</span>
                  <span className="text-white">{features.customStrategies === -1 ? 'Unlimited' : features.customStrategies}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data History</span>
                  <span className="text-white">{features.dataHistory}</span>
                </div>
              </div>
            </div>

              {!isPro ? (
                <Button onClick={handleUpgradeToPro} className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Button>
              ) : (
                <Button onClick={handleDowngradeToFree} variant="outline" className="w-full">
                  Downgrade to Free
                </Button>
              )}
          </CardContent>
        </Card>

        {/* Trading Defaults */}
        <Card className="bg-[#0a0e17] border-[#1a2332] mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Trading Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="lotSize" className="text-white">Default Lot Size</Label>
              <Input
                id="lotSize"
                type="number"
                step="0.1"
                min="0.1"
                value={defaultLotSize}
                onChange={(e) => setDefaultLotSize(parseFloat(e.target.value) || 0.1)}
                className="bg-[#050810] border-[#1a2332] mt-2"
              />
            </div>

            <div>
              <Label htmlFor="slPips" className="text-white">Default Stop Loss (pips)</Label>
              <Input
                id="slPips"
                type="number"
                min="1"
                value={defaultSLPips}
                onChange={(e) => setDefaultSLPips(parseInt(e.target.value) || 1)}
                className="bg-[#050810] border-[#1a2332] mt-2"
              />
            </div>

            <div>
              <Label htmlFor="tpPips" className="text-white">Default Take Profit (pips)</Label>
              <Input
                id="tpPips"
                type="number"
                min="1"
                value={defaultTPPips}
                onChange={(e) => setDefaultTPPips(parseInt(e.target.value) || 1)}
                className="bg-[#050810] border-[#1a2332] mt-2"
              />
            </div>

            <Button onClick={handleTradingDefaultsSave} className="w-full">
              Save Trading Defaults
            </Button>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="bg-[#0a0e17] border-[#1a2332]">
          <CardHeader>
            <CardTitle className="text-white">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Sound Effects</p>
                <p className="text-sm text-muted-foreground">Play sounds on trade actions</p>
              </div>
              <Switch
                checked={soundEnabled}
                onCheckedChange={(checked) => {
                  setSoundEnabled(checked);
                  storage.set('sound-enabled', checked);
                }}
              />
            </div>

            <Separator className="bg-[#1a2332]" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Notifications</p>
                <p className="text-sm text-muted-foreground">Show desktop notifications</p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={(checked) => {
                  setNotificationsEnabled(checked);
                  storage.set('notifications-enabled', checked);
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
