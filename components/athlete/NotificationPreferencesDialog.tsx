'use client';

import { useState } from 'react';
import {
  updateNotificationPreferences,
  type ParentConnection,
  type NotificationPreferences,
} from '@/lib/parent/actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface NotificationPreferencesDialogProps {
  connection: ParentConnection;
  onUpdate: () => void;
}

export function NotificationPreferencesDialog({
  connection,
  onUpdate,
}: NotificationPreferencesDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    notify_attendance: connection.notify_attendance,
    notify_performance: connection.notify_performance,
    notify_leave_requests: connection.notify_leave_requests,
    notify_announcements: connection.notify_announcements,
    notify_goals: connection.notify_goals,
    notification_frequency: connection.notification_frequency,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await updateNotificationPreferences(connection.id, preferences);
      
      if (result.success) {
        toast({
          title: 'อัพเดทสำเร็จ',
          description: result.message,
        });
        setOpen(false);
        onUpdate();
      } else {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error,
          variant: 'error',
        });
      }
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัพเดทการตั้งค่าได้',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>ตั้งค่าการแจ้งเตือน</DialogTitle>
            <DialogDescription>
              กำหนดประเภทและความถี่ของการแจ้งเตือนที่ผู้ปกครองจะได้รับ
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">ประเภทการแจ้งเตือน</h4>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="notify_attendance" className="flex flex-col gap-1">
                  <span>การเข้าฝึก</span>
                  <span className="text-xs text-gray-500 font-normal">
                    แจ้งเตือนเมื่อเข้าฝึกหรือขาดฝึก
                  </span>
                </Label>
                <Switch
                  id="notify_attendance"
                  checked={preferences.notify_attendance}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, notify_attendance: checked })
                  }
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notify_performance" className="flex flex-col gap-1">
                  <span>ผลการทดสอบ</span>
                  <span className="text-xs text-gray-500 font-normal">
                    แจ้งเตือนเมื่อมีผลการทดสอบใหม่
                  </span>
                </Label>
                <Switch
                  id="notify_performance"
                  checked={preferences.notify_performance}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, notify_performance: checked })
                  }
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notify_leave_requests" className="flex flex-col gap-1">
                  <span>การลา</span>
                  <span className="text-xs text-gray-500 font-normal">
                    แจ้งเตือนเมื่อยื่นคำขอลาหรือได้รับการอนุมัติ
                  </span>
                </Label>
                <Switch
                  id="notify_leave_requests"
                  checked={preferences.notify_leave_requests}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, notify_leave_requests: checked })
                  }
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notify_announcements" className="flex flex-col gap-1">
                  <span>ประกาศ</span>
                  <span className="text-xs text-gray-500 font-normal">
                    แจ้งเตือนเมื่อมีประกาศสำคัญ
                  </span>
                </Label>
                <Switch
                  id="notify_announcements"
                  checked={preferences.notify_announcements}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, notify_announcements: checked })
                  }
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notify_goals" className="flex flex-col gap-1">
                  <span>เป้าหมาย</span>
                  <span className="text-xs text-gray-500 font-normal">
                    แจ้งเตือนเมื่อมีเป้าหมายใหม่หรือบรรลุเป้าหมาย
                  </span>
                </Label>
                <Switch
                  id="notify_goals"
                  checked={preferences.notify_goals}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, notify_goals: checked })
                  }
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notification_frequency">ความถี่การแจ้งเตือน</Label>
              <Select
                value={preferences.notification_frequency}
                onValueChange={(value: 'immediate' | 'daily' | 'weekly') =>
                  setPreferences({ ...preferences, notification_frequency: value })
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">ทันที</SelectItem>
                  <SelectItem value="daily">รายวัน (สรุปท้ายวัน)</SelectItem>
                  <SelectItem value="weekly">รายสัปดาห์ (สรุปท้ายสัปดาห์)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {preferences.notification_frequency === 'immediate' && 
                  'ได้รับการแจ้งเตือนทันทีเมื่อมีเหตุการณ์'}
                {preferences.notification_frequency === 'daily' && 
                  'ได้รับสรุปการแจ้งเตือนทุกวันเวลา 18:00 น.'}
                {preferences.notification_frequency === 'weekly' && 
                  'ได้รับสรุปการแจ้งเตือนทุกวันอาทิตย์เวลา 18:00 น.'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
