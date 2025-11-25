import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function MonitoringPage() {
  const supabase = await createClient();
  
  // ตรวจสอบว่าเป็น admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };
  
  if (profile?.role !== 'admin') redirect('/dashboard');
  
  // ดึงข้อมูลปัญหาที่เกิดบ่อย (24 ชั่วโมง)
  const errorStatsResult = await supabase.rpc('get_error_stats_24h');
  const errorStats = errorStatsResult.data;
  
  // ดึงข้อผิดพลาดล่าสุด
  const { data: recentErrors } = await supabase
    .from('error_logs')
    .select(`
      id,
      error_type,
      error_code,
      error_message,
      created_at,
      page_url,
      user_id
    `)
    .order('created_at', { ascending: false })
    .limit(20);
  
  // ดึงการสมัครที่ไม่สมบูรณ์
  const { data: incompleteRegs } = await supabase
    .from('incomplete_registrations')
    .select('*')
    .limit(20);
  
  // ดึงสถิติการสมัคร
  const signupStatsResult = await supabase
    .from('auth.users')
    .select('created_at')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  const signupStats = signupStatsResult.data;
  
  // นับ Auth Users ที่ไม่มี Profile
  const usersWithoutProfileResult = await supabase
    .from('auth.users')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .is('profiles.id', null);
  const usersWithoutProfile = usersWithoutProfileResult.count;
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">ติดตามปัญหาและข้อมูล</h1>
      </div>
      
      {/* สถิติภาพรวม */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">การสมัคร (7 วัน)</div>
          <div className="text-3xl font-bold">{signupStats?.length || 0}</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">ข้อผิดพลาด (24 ชม.)</div>
          <div className="text-3xl font-bold text-red-600">
            {recentErrors?.filter(e => 
              new Date(e.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
            ).length || 0}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">การสมัครไม่สมบูรณ์</div>
          <div className="text-3xl font-bold text-orange-600">
            {incompleteRegs?.length || 0}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Users ไม่มี Profile</div>
          <div className="text-3xl font-bold text-yellow-600">
            {usersWithoutProfile || 0}
          </div>
        </div>
      </div>
      
      {/* ข้อผิดพลาดล่าสุด */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">ข้อผิดพลาดล่าสุด (20 รายการ)</h2>
        
        {!recentErrors || recentErrors.length === 0 ? (
          <p className="text-gray-500">ไม่มีข้อผิดพลาด 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เวลา</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ประเภท</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">รหัส</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ข้อความ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">หน้า</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentErrors.map((error) => (
                  <tr key={error.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(error.created_at).toLocaleString('th-TH')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        error.error_type === 'rate_limit' ? 'bg-red-100 text-red-800' :
                        error.error_type === 'auth' ? 'bg-yellow-100 text-yellow-800' :
                        error.error_type === 'validation' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {error.error_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{error.error_code || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">
                      {error.error_message}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {error.page_url || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* การสมัครที่ไม่สมบูรณ์ */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">การสมัครที่ไม่สมบูรณ์</h2>
        
        {!incompleteRegs || incompleteRegs.length === 0 ? (
          <p className="text-gray-500">ไม่มีการสมัครที่ไม่สมบูรณ์ ✅</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">อีเมล</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ครั้งสุดท้าย</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ขั้นตอนที่ทำแล้ว</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">จำนวนครั้ง</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incompleteRegs.map((reg: any) => (
                  <tr key={reg.user_id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{reg.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(reg.last_attempt).toLocaleString('th-TH')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {reg.completed_steps?.join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{reg.attempt_count}</td>
                    <td className="px-4 py-3 text-sm text-red-600 max-w-xs truncate">
                      {reg.last_error || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* คำแนะนำ */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 วิธีใช้งาน</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• ตรวจสอบข้อผิดพลาดที่เกิดบ่อยเพื่อแก้ไขปัญหา</li>
          <li>• ดูการสมัครที่ไม่สมบูรณ์เพื่อช่วยเหลือผู้ใช้</li>
          <li>• รันสคริปต์เพื่อดูรายละเอียดเพิ่มเติม: <code className="bg-blue-100 px-2 py-1 rounded">./scripts/monitor-user-issues.sh</code></li>
        </ul>
      </div>
    </div>
  );
}
