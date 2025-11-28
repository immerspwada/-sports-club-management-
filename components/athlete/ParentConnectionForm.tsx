'use client';

import { useState } from 'react';
import { addParentConnection, type AddParentInput } from '@/lib/parent/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export function ParentConnectionForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<AddParentInput>({
    parentEmail: '',
    parentName: '',
    relationship: 'father',
    phoneNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.parentEmail || !formData.parentName) {
      toast({
        title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        description: 'อีเมลและชื่อผู้ปกครองเป็นข้อมูลที่จำเป็น',
        variant: 'error',
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.parentEmail)) {
      toast({
        title: 'อีเมลไม่ถูกต้อง',
        description: 'กรุณากรอกอีเมลที่ถูกต้อง',
        variant: 'error',
      });
      return;
    }

    setLoading(true);
    
    try {
      const result = await addParentConnection(formData);
      
      if (result.success) {
        toast({
          title: 'เพิ่มผู้ปกครองสำเร็จ',
          description: result.message || 'กรุณาให้ผู้ปกครองตรวจสอบอีเมลเพื่อยืนยัน',
        });
        
        // Reset form
        setFormData({
          parentEmail: '',
          parentName: '',
          relationship: 'father',
          phoneNumber: '',
        });
        
        setOpen(false);
      } else {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถเพิ่มผู้ปกครองได้',
          variant: 'error',
        });
      }
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเพิ่มผู้ปกครองได้',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <UserPlus className="w-4 h-4 mr-2" />
          เพิ่มผู้ปกครอง
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>เพิ่มผู้ปกครอง</DialogTitle>
            <DialogDescription>
              เพิ่มอีเมลผู้ปกครองเพื่อให้ได้รับการแจ้งเตือนเกี่ยวกับความก้าวหน้าของคุณ
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="parentEmail">
                อีเมลผู้ปกครอง <span className="text-red-500">*</span>
              </Label>
              <Input
                id="parentEmail"
                type="email"
                placeholder="parent@example.com"
                value={formData.parentEmail}
                onChange={(e) =>
                  setFormData({ ...formData, parentEmail: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="parentName">
                ชื่อผู้ปกครอง <span className="text-red-500">*</span>
              </Label>
              <Input
                id="parentName"
                type="text"
                placeholder="คุณสมชาย ใจดี"
                value={formData.parentName}
                onChange={(e) =>
                  setFormData({ ...formData, parentName: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="relationship">
                ความสัมพันธ์ <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.relationship}
                onValueChange={(value: 'father' | 'mother' | 'guardian') =>
                  setFormData({ ...formData, relationship: value })
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="father">พ่อ</SelectItem>
                  <SelectItem value="mother">แม่</SelectItem>
                  <SelectItem value="guardian">ผู้ปกครอง</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phoneNumber">เบอร์โทรศัพท์ (ไม่บังคับ)</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="08X-XXX-XXXX"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                disabled={loading}
              />
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
              เพิ่มผู้ปกครอง
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
