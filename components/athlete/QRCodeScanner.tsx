'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { checkInWithQR } from '@/lib/activity/actions';
import { useToast } from '@/components/ui/toast';
import { QrCode, Loader2 } from 'lucide-react';

interface QRCodeScannerProps {
  activityId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function QRCodeScanner({ activityId, onClose, onSuccess }: QRCodeScannerProps) {
  const [qrToken, setQrToken] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!qrToken.trim()) {
      addToast({
        title: 'กรุณากรอก QR Code',
        description: 'กรุณากรอกรหัส QR Code',
        variant: 'error',
      });
      return;
    }

    setLoading(true);
    const result = await checkInWithQR(activityId, qrToken.trim());
    setLoading(false);

    if (result.error) {
      addToast({
        title: 'เกิดข้อผิดพลาด',
        description: result.error,
        variant: 'error',
      });
    } else {
      addToast({
        title: 'เช็คอินสำเร็จ!',
        description: (result.data as any)?.status === 'on_time' 
          ? 'คุณมาตรงเวลา' 
          : 'คุณมาสาย',
        variant: 'success',
      });
      onSuccess();
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            เช็คอินด้วย QR Code
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              placeholder="กรอกรหัสจาก QR Code"
              disabled={loading}
              autoFocus
              className="text-center text-lg"
            />
            <p className="text-xs text-gray-500 mt-2 text-center">
              กรอกรหัสที่ได้จาก QR Code
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={loading || !qrToken.trim()}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังเช็คอิน...
                </>
              ) : (
                'เช็คอิน'
              )}
            </Button>
          </div>
        </form>

        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-900 text-center">
            ขอให้โค้ชแสดง QR Code แล้วกรอกรหัสที่ได้
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
