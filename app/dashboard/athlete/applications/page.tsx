'use client';

/**
 * My Applications Page (Athlete View)
 * 
 * This page displays all membership applications submitted by the current athlete.
 * Athletes can view their application status, see rejection reasons, and track
 * the approval process.
 * 
 * Features:
 * - Fetches user's applications using getMyApplications(userId)
 * - Shows stats: total, pending, approved, rejected
 * - Groups applications by status with tabs/sections
 * - Renders ApplicationStatusCard for each application
 * - "สมัครกีฬาใหม่" button linking to /register-membership
 * - Empty state if no applications
 * - View details modal (read-only for athletes)
 * 
 * Validates: Requirements US-4, US-8
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getMyApplications } from '@/lib/membership/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface Application {
  id: string;
  club_id: string;
  personal_info: any;
  documents: any[];
  status: 'pending' | 'approved' | 'rejected' | 'info_requested';
  review_info: any;
  activity_log: any[];
  profile_id: string | null;
  created_at: string;
  updated_at: string;
  clubs: {
    id: string;
    name: string;
    sport_type: string | null;
  };
}

export default function AthleteApplicationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    setLoading(true);

    // Get current user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      toast({
        title: 'กรุณาเข้าสู่ระบบ',
        description: 'คุณต้องเข้าสู่ระบบเพื่อดูใบสมัคร',
        variant: 'error',
      });
      router.push('/login');
      return;
    }

    setUserId(user.id);

    // Fetch applications
    const result = await getMyApplications(user.id);

    if (result.error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: result.error,
        variant: 'error',
      });
    } else {
      setApplications((result.data || []) as Application[]);
    }

    setLoading(false);
  }

  // Calculate stats
  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  // Filter applications by status
  const pendingApps = applications.filter((a) => a.status === 'pending');
  const approvedApps = applications.filter((a) => a.status === 'approved');
  const rejectedApps = applications.filter((a) => a.status === 'rejected');

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ใบสมัครของฉัน</h1>
          <p className="text-gray-600 mt-1">ติดตามสถานะการสมัครสมาชิกกีฬา</p>
        </div>
        <Button onClick={() => router.push('/register-membership')}>
          <Plus className="w-4 h-4 mr-2" />
          สมัครกีฬาใหม่
        </Button>
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
              รอการอนุมัติ
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
              เข้าร่วมได้แล้ว
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

      {/* Empty State */}
      {applications.length === 0 && (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ยังไม่มีใบสมัคร
              </h3>
              <p className="text-gray-600 mb-6">
                คุณยังไม่ได้สมัครกีฬาใดๆ เลย เริ่มต้นสมัครกีฬาที่คุณสนใจกันเลย!
              </p>
              <Button onClick={() => router.push('/register-membership')}>
                <Plus className="w-4 h-4 mr-2" />
                สมัครกีฬาใหม่
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications List with Tabs */}
      {applications.length > 0 && (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              ทั้งหมด ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="pending">
              รอพิจารณา ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="approved">
              อนุมัติแล้ว ({stats.approved})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              ไม่อนุมัติ ({stats.rejected})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {applications.map((app) => (
              <ApplicationCard key={app.id} application={app} />
            ))}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingApps.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-600">
                  ไม่มีใบสมัครที่รอพิจารณา
                </CardContent>
              </Card>
            ) : (
              pendingApps.map((app) => (
                <ApplicationCard key={app.id} application={app} />
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedApps.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-600">
                  ยังไม่มีใบสมัครที่ได้รับการอนุมัติ
                </CardContent>
              </Card>
            ) : (
              approvedApps.map((app) => (
                <ApplicationCard key={app.id} application={app} />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedApps.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-600">
                  ไม่มีใบสมัครที่ถูกปฏิเสธ
                </CardContent>
              </Card>
            ) : (
              rejectedApps.map((app) => (
                <ApplicationCard key={app.id} application={app} />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Application Card Component
function ApplicationCard({ application }: { application: Application }) {
  const statusConfig = {
    pending: {
      label: 'รอการอนุมัติ',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: Clock,
    },
    approved: {
      label: 'อนุมัติแล้ว',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle,
    },
    rejected: {
      label: 'ไม่อนุมัติ',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: XCircle,
    },
    info_requested: {
      label: 'ขอข้อมูลเพิ่มเติม',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: FileText,
    },
  };

  const config = statusConfig[application.status];
  const StatusIcon = config.icon;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{application.clubs.name}</CardTitle>
            {application.clubs.sport_type && (
              <CardDescription className="mt-1">
                {application.clubs.sport_type}
              </CardDescription>
            )}
          </div>
          <div className={`px-3 py-1 rounded-full border flex items-center space-x-1 ${config.color}`}>
            <StatusIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{config.label}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Dates */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>วันที่สมัคร: {formatDate(application.created_at)}</span>
          {application.review_info?.reviewed_at && (
            <span>
              วันที่พิจารณา: {formatDate(application.review_info.reviewed_at)}
            </span>
          )}
        </div>

        {/* Rejection Reason */}
        {application.status === 'rejected' && (
          <div className="space-y-3">
            {application.review_info?.notes && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-900 mb-1">เหตุผลที่ไม่อนุมัติ:</p>
                <p className="text-sm text-red-800">{application.review_info.notes}</p>
              </div>
            )}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => window.location.href = '/register-membership'}
              >
                <Plus className="w-4 h-4 mr-2" />
                สมัครใหม่
              </Button>
            </div>
          </div>
        )}

        {/* Approval Info */}
        {application.status === 'approved' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
            <p className="text-sm text-green-800">
              🎉 ยินดีด้วย! ใบสมัครของคุณได้รับการอนุมัติแล้ว คุณสามารถเข้าร่วมฝึกซ้อมได้
            </p>
            {application.review_info?.reviewed_by && (
              <p className="text-xs text-green-700">
                อนุมัติโดยโค้ชของชมรม
              </p>
            )}
          </div>
        )}

        {/* Pending Info */}
        {application.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              ⏳ ใบสมัครของคุณอยู่ระหว่างการพิจารณา กรุณารอการอนุมัติจากโค้ช
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
