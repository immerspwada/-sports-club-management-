'use client';

/**
 * Admin Rate Limit Management Page
 * 
 * Features:
 * - View recent signup attempts
 * - Identify potentially rate-limited IPs
 * - Manually create users to bypass rate limits
 * - Monitor signup activity
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  UserPlus, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';

interface SignupAttempt {
  id: string;
  email: string;
  created_at: string;
  email_confirmed: boolean;
}

export default function RateLimitsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recentSignups, setRecentSignups] = useState<SignupAttempt[]>([]);
  const [stats, setStats] = useState({
    last_hour: 0,
    last_24h: 0,
    status: 'ปกติ'
  });

  // Form state for manual user creation
  const [formData, setFormData] = useState({
    email: '',
    password: 'TestPassword123!',
    full_name: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const supabase = createClient();

      // Get recent signups
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Calculate stats
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const signupsLastHour = users?.filter(
        (u: any) => new Date(u.created_at) > oneHourAgo
      ).length || 0;

      const signupsLast24h = users?.filter(
        (u: any) => new Date(u.created_at) > oneDayAgo
      ).length || 0;

      setStats({
        last_hour: signupsLastHour,
        last_24h: signupsLast24h,
        status: signupsLastHour > 5 ? 'อาจถูก rate limit' : 'ปกติ'
      });

      setRecentSignups(users || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลได้',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast({
      title: 'รีเฟรชสำเร็จ',
      description: 'ข้อมูลได้รับการอัพเดทแล้ว',
    });
  }

  async function handleCreateUser() {
    if (!formData.email || !formData.full_name) {
      toast({
        title: 'กรุณากรอกข้อมูลให้ครบ',
        description: 'ต้องระบุอีเมลและชื่อ-นามสกุล',
        variant: 'error',
      });
      return;
    }

    setCreating(true);
    try {
      const supabase = createClient();

      // Use Admin API to create user (bypasses rate limiting)
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'ไม่สามารถสร้างผู้ใช้ได้');
      }

      toast({
        title: 'สร้างผู้ใช้สำเร็จ! 🎉',
        description: `สร้างบัญชี ${formData.email} เรียบร้อยแล้ว`,
      });

      // Reset form
      setFormData({
        email: '',
        password: 'TestPassword123!',
        full_name: '',
      });

      // Reload data
      await loadData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถสร้างผู้ใช้ได้',
        variant: 'error',
      });
    } finally {
      setCreating(false);
    }
  }

  function getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    return `${diffDays} วันที่แล้ว`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">จัดการ Rate Limiting</h1>
          <p className="text-gray-600 mt-1">
            ตรวจสอบและจัดการการสมัครสมาชิกที่อาจถูก rate limit
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              การสมัครในชั่วโมงที่แล้ว
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.last_hour}</div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.last_hour > 5 ? '⚠️ เกินขอบเขต rate limit' : '✅ ปกติ'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              การสมัครใน 24 ชั่วโมง
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.last_24h}</div>
              <Shield className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ทั้งหมด {stats.last_24h} บัญชี
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              สถานะระบบ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge
                variant={stats.status === 'ปกติ' ? 'default' : 'destructive'}
                className="text-base px-3 py-1"
              >
                {stats.status}
              </Badge>
              {stats.status === 'ปกติ' ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.status === 'ปกติ' 
                ? 'ไม่มีปัญหา rate limiting' 
                : 'อาจมีผู้ใช้ถูกบล็อก'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Manual User Creation (Bypass Rate Limit) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserPlus className="w-5 h-5 mr-2" />
            สร้างผู้ใช้ใหม่ (ปลดล็อก Rate Limit)
          </CardTitle>
          <CardDescription>
            สร้างบัญชีผู้ใช้โดยไม่ถูก rate limit - ใช้สำหรับช่วยเหลือผู้ใช้ที่ถูกบล็อก
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 <strong>วิธีใช้:</strong> เมื่อผู้ใช้ถูก rate limit ให้ Admin สร้างบัญชีให้ผ่านฟอร์มนี้
                แล้วส่งข้อมูล login ให้ผู้ใช้
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">อีเมล *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">ชื่อ-นามสกุล *</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="ชื่อ นามสกุล"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <Input
                  id="password"
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <p className="text-xs text-gray-500">
                  รหัสผ่านเริ่มต้น (ผู้ใช้สามารถเปลี่ยนได้ภายหลัง)
                </p>
              </div>
            </div>

            <Button
              onClick={handleCreateUser}
              disabled={creating || !formData.email || !formData.full_name}
              className="w-full md:w-auto"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  สร้างผู้ใช้ (Bypass Rate Limit)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Signups */}
      <Card>
        <CardHeader>
          <CardTitle>การสมัครล่าสุด</CardTitle>
          <CardDescription>
            แสดง 20 บัญชีล่าสุด - ใช้ตรวจสอบว่ามีการสมัครบ่อยเกินไปหรือไม่
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentSignups.length === 0 ? (
              <p className="text-center text-gray-500 py-8">ไม่มีข้อมูลการสมัคร</p>
            ) : (
              recentSignups.map((signup) => (
                <div
                  key={signup.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{signup.email}</p>
                    <p className="text-xs text-gray-500">
                      {getTimeAgo(signup.created_at)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {new Date(signup.created_at).toLocaleString('th-TH')}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">📚 คำแนะนำ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium mb-1">🔒 Rate Limiting คืออะไร?</p>
            <p className="text-gray-600">
              Supabase จำกัดจำนวนการสมัครสมาชิกเป็น 3-5 ครั้งต่อชั่วโมงต่อ IP address
              เพื่อป้องกัน spam และ abuse
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">⏰ Rate Limit จะหมดอายุเมื่อไหร่?</p>
            <p className="text-gray-600">
              โดยปกติจะหมดอายุภายใน 1-2 ชั่วโมง หลังจากการสมัครครั้งแรก
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">💡 วิธีช่วยผู้ใช้ที่ถูกบล็อก</p>
            <p className="text-gray-600">
              1. ใช้ฟอร์ม "สร้างผู้ใช้ใหม่" ด้านบน<br />
              2. กรอกอีเมลและชื่อของผู้ใช้<br />
              3. คลิก "สร้างผู้ใช้" แล้วส่งข้อมูล login ให้ผู้ใช้
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
