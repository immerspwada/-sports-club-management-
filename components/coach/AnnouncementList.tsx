'use client';

import { useState } from 'react';
import { Bell, Pin, Trash2, Edit, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deleteAnnouncement } from '@/lib/coach/announcement-actions';
import { useToast } from '@/hooks/useToast';

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface AnnouncementListProps {
  announcements: Announcement[];
}

export function AnnouncementList({ announcements }: AnnouncementListProps) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบประกาศนี้?')) {
      return;
    }

    setDeletingId(id);
    try {
      const result = await deleteAnnouncement(id);
      if (result.success) {
        toast({
          title: 'สำเร็จ',
          description: 'ลบประกาศเรียบร้อยแล้ว',
        });
      } else {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถลบประกาศได้',
          variant: 'error',
        });
      }
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถลบประกาศได้',
        variant: 'error',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'เร่งด่วน';
      case 'high':
        return 'สำคัญ';
      case 'normal':
        return 'ปกติ';
      case 'low':
        return 'ต่ำ';
      default:
        return priority;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (announcements.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <Bell className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-black mb-2">ยังไม่มีประกาศ</h3>
        <p className="text-sm text-gray-500">
          สร้างประกาศเพื่อแจ้งเตือนนักกีฬาในสโมสรของคุณ
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((announcement) => (
        <div
          key={announcement.id}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {announcement.is_pinned && (
                  <Pin className="h-4 w-4 text-black" />
                )}
                <h3 className="font-bold text-black line-clamp-1">
                  {announcement.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getPriorityColor(
                    announcement.priority
                  )}`}
                >
                  {getPriorityLabel(announcement.priority)}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(announcement.created_at)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleDelete(announcement.id)}
                  disabled={deletingId === announcement.id}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  ลบประกาศ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Message */}
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {announcement.message}
          </p>
        </div>
      ))}
    </div>
  );
}
