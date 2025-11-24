'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Settings as SettingsIcon } from 'lucide-react';
import { getSystemSettings, updateSystemSetting, type SystemSetting } from '@/lib/admin/settings-actions';
import { useToast } from '@/hooks/useToast';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local state for settings
  const [requireEmailVerification, setRequireEmailVerification] = useState(false);
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(true);
  const [requireCoachApproval, setRequireCoachApproval] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const result = await getSystemSettings();

    if (result.success && result.data) {
      setSettings(result.data);

      // Set local state from database
      result.data.forEach((setting) => {
        const value = setting.setting_value === 'true' || setting.setting_value === true;
        
        switch (setting.setting_key) {
          case 'require_email_verification':
            setRequireEmailVerification(value);
            break;
          case 'allow_self_registration':
            setAllowSelfRegistration(value);
            break;
          case 'require_coach_approval':
            setRequireCoachApproval(value);
            break;
        }
      });
    } else {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: result.error || 'ไม่สามารถโหลดการตั้งค่าได้',
        variant: 'error',
      });
    }

    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);

    try {
      // Update all settings
      const updates = [
        updateSystemSetting('require_email_verification', requireEmailVerification),
        updateSystemSetting('allow_self_registration', allowSelfRegistration),
        updateSystemSetting('require_coach_approval', requireCoachApproval),
      ];

      const results = await Promise.all(updates);

      const hasError = results.some((r) => !r.success);

      if (hasError) {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถบันทึกการตั้งค่าบางส่วนได้',
          variant: 'error',
        });
      } else {
        toast({
          title: 'บันทึกสำเร็จ! ✅',
          description: 'การตั้งค่าระบบถูกอัปเดตเรียบร้อยแล้ว',
          variant: 'default',
        });

        // Reload settings
        await loadSettings();
      }
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกการตั้งค่าได้',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">การตั้งค่าระบบ</h1>
        </div>
        <p className="text-gray-600">จัดการการตั้งค่าระบบสมัครสมาชิกและการยืนยันตัวตน</p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Authentication Settings */}
        <Card>
          <CardHeader>
            <CardTitle>การยืนยันตัวตน</CardTitle>
            <CardDescription>
              ตั้งค่าวิธีการสมัครสมาชิกและการยืนยันอีเมล
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Verification */}
            <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="email-verification" className="text-base font-medium">
                  ต้องการยืนยันอีเมล (OTP)
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  เปิดใช้งานระบบ OTP เพื่อยืนยันอีเมลหลังสมัครสมาชิก
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ ต้องตั้งค่า SMTP provider (SendGrid, AWS SES) ก่อนเปิดใช้งาน
                </p>
              </div>
              <Switch
                id="email-verification"
                checked={requireEmailVerification}
                onCheckedChange={setRequireEmailVerification}
              />
            </div>

            {/* Self Registration */}
            <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="self-registration" className="text-base font-medium">
                  อนุญาตให้สมัครสมาชิกเอง
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  ผู้ใช้สามารถสมัครบัญชีใหม่ได้เอง (แนะนำให้เปิด)
                </p>
              </div>
              <Switch
                id="self-registration"
                checked={allowSelfRegistration}
                onCheckedChange={setAllowSelfRegistration}
              />
            </div>
          </CardContent>
        </Card>

        {/* Membership Settings */}
        <Card>
          <CardHeader>
            <CardTitle>การสมัครสมาชิกกีฬา</CardTitle>
            <CardDescription>
              ตั้งค่าขั้นตอนการสมัครเข้าร่วมกีฬา
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Coach Approval */}
            <div className="flex items-center justify-between space-x-4 p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="coach-approval" className="text-base font-medium">
                  ต้องการให้โค้ชอนุมัติ
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  นักกีฬาต้องรอให้โค้ชอนุมัติก่อนเข้าใช้งาน (แนะนำให้เปิด)
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  💡 ถ้าปิด: นักกีฬาจะเข้าใช้งานได้ทันทีหลังสมัคร
                </p>
              </div>
              <Switch
                id="coach-approval"
                checked={requireCoachApproval}
                onCheckedChange={setRequireCoachApproval}
              />
            </div>
          </CardContent>
        </Card>

        {/* Current Configuration Summary */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">สรุปการตั้งค่าปัจจุบัน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-blue-800">ระบบ OTP:</span>
                <span className="font-medium text-blue-900">
                  {requireEmailVerification ? '🟢 เปิดใช้งาน' : '🔴 ปิดใช้งาน'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-800">สมัครสมาชิกเอง:</span>
                <span className="font-medium text-blue-900">
                  {allowSelfRegistration ? '🟢 อนุญาต' : '🔴 ไม่อนุญาต'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-800">โค้ชอนุมัติ:</span>
                <span className="font-medium text-blue-900">
                  {requireCoachApproval ? '🟢 ต้องอนุมัติ' : '🔴 ไม่ต้องอนุมัติ'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-blue-300">
              <p className="text-xs text-blue-700">
                <strong>Flow ปัจจุบัน:</strong>{' '}
                {requireEmailVerification
                  ? 'สมัคร → ยืนยัน OTP → สมัครกีฬา'
                  : 'สมัคร → สมัครกีฬา'}{' '}
                →{' '}
                {requireCoachApproval
                  ? 'รอโค้ชอนุมัติ → เข้าใช้งาน'
                  : 'เข้าใช้งานทันที'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="min-w-[200px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                บันทึกการตั้งค่า
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
