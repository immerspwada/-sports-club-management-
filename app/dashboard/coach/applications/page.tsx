'use client';

/**
 * Coach Applications Page
 * 
 * This page allows coaches to view and manage membership applications
 * for their sport/club. Coaches can approve or reject applications.
 * 
 * Features:
 * - Fetch applications using getClubApplications(clubId)
 * - Display stats cards: pending, approved, rejected counts
 * - Render ApplicationList component
 * - Handle view details (ApplicationDetailModal)
 * - Handle approve/reject actions
 * - Toast notifications for success/error
 * - Auto-refresh after actions
 * 
 * Validates: Requirements US-3, US-7
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getClubApplications } from '@/lib/membership/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApplicationReviewCard } from '@/components/coach/ApplicationReviewCard';
import { Loader2, FileText, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Application {
  id: string;
  user_id: string;
  club_id: string;
  personal_info: any;
  documents: any[];
  status: 'pending' | 'approved' | 'rejected' | 'info_requested';
  review_info?: any;
  activity_log: any[];
  profile_id?: string | null;
  created_at: string;
  updated_at: string;
  clubs?: {
    id: string;
    name: string;
    sport_type: string | null;
  };
}

export default function CoachApplicationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [coachClubId, setCoachClubId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    setLoading(true);

    try {
      // Get current user and their coach profile
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        toast({
          title: 'กรุณาเข้าสู่ระบบ',
          description: 'คุณต้องเข้าสู่ระบบเพื่อดูใบสมัคร',
          variant: 'destructive',
        });
        router.push('/login');
        return;
      }

      // Get coach's club_id
      const { data: coachData, error: coachError } = await supabase
        .from('coaches')
        .select('club_id')
        .eq('user_id', user.id)
        .single();

      if (coachError || !coachData) {
        toast({
          title: 'ไม่พบข้อมูลโค้ช',
          description: 'ไม่พบข้อมูลโค้ชในระบบ',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const clubId = (coachData as any).club_id;
      setCoachClubId(clubId);

      // Fetch applications for this club
      const result = await getClubApplications(clubId);

      if (result.error) {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        setApplications((result.data || []) as Application[]);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดใบสมัครได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  // Filter applications based on status
  const filteredApplications = applications.filter((app) => {
    if (statusFilter === 'all') return true;
    return app.status === statusFilter;
  });

  // Calculate stats
  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">กำลังโหลดใบสมัคร...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">ใบสมัครสมาชิก</h1>
        <p className="text-gray-600 mt-1">จัดการใบสมัครเข้าร่วมกีฬาของคุณ</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>ทั้งหมด</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-gray-600">
              <FileText className="w-4 h-4 mr-1" />
              ใบสมัครทั้งหมด
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>รอพิจารณา</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-1" />
              ต้องดำเนินการ
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>อนุมัติแล้ว</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.approved}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 mr-1" />
              เข้าร่วมแล้ว
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>ไม่อนุมัติ</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.rejected}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-gray-600">
              <XCircle className="w-4 h-4 mr-1" />
              ถูกปฏิเสธ
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Section */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium">กรอง:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="เลือกสถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="pending">รอพิจารณา</SelectItem>
            <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
            <SelectItem value="rejected">ไม่อนุมัติ</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            ล้างตัวกรอง
          </Button>
        )}
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              {statusFilter === 'all'
                ? 'ยังไม่มีใบสมัคร'
                : `ไม่มีใบสมัครที่${
                    statusFilter === 'pending'
                      ? 'รอพิจารณา'
                      : statusFilter === 'approved'
                      ? 'อนุมัติแล้ว'
                      : 'ไม่อนุมัติ'
                  }`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <ApplicationReviewCard
              key={application.id}
              application={application as any}
            />
          ))}
        </div>
      )}
    </div>
  );
}
