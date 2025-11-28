import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, User } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'รายงานความก้าวหน้า | ระบบจัดการสโมสรกีฬา',
  description: 'จัดการรายงานความก้าวหน้าของนักกีฬา',
};

export default async function CoachProgressReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get coach profile
  const { data: coach } = await supabase
    .from('coaches')
    .select('id, club_id')
    .eq('user_id', user.id)
    .maybeSingle() as { data: { id: string; club_id: string } | null };

  if (!coach) {
    redirect('/dashboard/coach');
  }

  // Get all progress reports for athletes in coach's club
  const { data: reports } = await (supabase as any)
    .from('progress_reports')
    .select(`
      *,
      athletes!inner (
        id,
        first_name,
        last_name,
        nickname,
        club_id
      )
    `)
    .eq('athletes.club_id', coach.club_id)
    .order('created_at', { ascending: false });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      draft: { label: 'แบบร่าง', className: 'bg-gray-100 text-gray-800' },
      published: { label: 'เผยแพร่แล้ว', className: 'bg-green-100 text-green-800' },
      archived: { label: 'เก็บถาวร', className: 'bg-blue-100 text-blue-800' },
    };
    return config[status] || config.draft;
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      weekly: 'รายสัปดาห์',
      monthly: 'รายเดือน',
      quarterly: 'รายไตรมาส',
      yearly: 'รายปี',
      custom: 'กำหนดเอง',
    };
    return labels[type] || type;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">รายงานความก้าวหน้า</h1>
          <p className="text-muted-foreground mt-2">
            จัดการรายงานความก้าวหน้าของนักกีฬาในสโมสร
          </p>
        </div>
      </div>

      {!reports || reports.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>ยังไม่มีรายงาน</CardTitle>
            <CardDescription>
              คุณยังไม่ได้สร้างรายงานความก้าวหน้า
              ไปที่หน้ารายละเอียดนักกีฬาเพื่อสร้างรายงาน
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/coach/athletes">
              <Button>
                <User className="h-4 w-4 mr-2" />
                ดูรายชื่อนักกีฬา
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report: any) => {
            const statusBadge = getStatusBadge(report.status);
            return (
              <Card key={report.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">
                        {report.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {report.athletes.first_name} {report.athletes.last_name}
                        {report.athletes.nickname && ` (${report.athletes.nickname})`}
                      </CardDescription>
                    </div>
                    <Badge className={statusBadge.className}>
                      {statusBadge.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>
                      {formatDate(report.period_start)} - {formatDate(report.period_end)}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="h-4 w-4 mr-2" />
                    <span>{getReportTypeLabel(report.report_type)}</span>
                  </div>

                  {report.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {report.summary}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Link
                      href={`/dashboard/coach/athletes/${report.athlete_id}`}
                      className="flex-1"
                    >
                      <Button variant="outline" className="w-full">
                        ดูนักกีฬา
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
