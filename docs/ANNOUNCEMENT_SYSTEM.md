# ระบบประกาศแจ้งเตือน (Announcement System)

## ภาพรวม

ระบบประกาศแจ้งเตือนช่วยให้โค้ชสามารถสร้างและจัดการประกาศเพื่อแจ้งข่าวสารสำคัญให้กับนักกีฬาในสโมสรที่ตัวเองดูแล

## คุณสมบัติหลัก

### สำหรับโค้ช
- ✅ สร้างประกาศใหม่พร้อมระบุระดับความสำคัญ (ต่ำ, ปกติ, สูง, เร่งด่วน)
- ✅ ปักหมุดประกาศสำคัญไว้ด้านบน
- ✅ แก้ไขและลบประกาศ
- ✅ ดูสถิติการอ่านประกาศ
- ✅ UI แบบ Native App (ขาว-ดำ)

### สำหรับนักกีฬา
- ✅ ดูประกาศจากโค้ชในสโมสร
- ✅ แสดงสถานะอ่าน/ยังไม่อ่าน
- ✅ ทำเครื่องหมายอ่านอัตโนมัติเมื่อเปิดดู
- ✅ แสดงประกาศล่าสุดในหน้า Dashboard
- ✅ UI แบบ Native App

## โครงสร้าง Database

### ตาราง `announcements`
```sql
- id: UUID (Primary Key)
- coach_id: UUID (Foreign Key -> coaches.id)
- title: TEXT (3-200 ตัวอักษร)
- message: TEXT (10-5000 ตัวอักษร)
- priority: TEXT (low, normal, high, urgent)
- target_audience: TEXT (all, athletes, specific)
- is_pinned: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- expires_at: TIMESTAMPTZ (nullable)
- metadata: JSONB
```

### ตาราง `announcement_reads`
```sql
- id: UUID (Primary Key)
- announcement_id: UUID (Foreign Key -> announcements.id)
- user_id: UUID (Foreign Key -> auth.users.id)
- read_at: TIMESTAMPTZ
- UNIQUE(announcement_id, user_id)
```

### View `announcement_stats`
แสดงสถิติการอ่านประกาศ:
- จำนวนคนที่อ่าน (read_count)
- จำนวนนักกีฬาทั้งหมด (total_athletes)
- อัตราการอ่าน (read_count / total_athletes)

## RLS Policies

### Announcements Table
1. **coaches_view_own_club_announcements**: โค้ชดูประกาศในสโมสรของตัวเอง
2. **coaches_create_announcements**: โค้ชสร้างประกาศได้
3. **coaches_update_own_announcements**: โค้ชแก้ไขประกาศของตัวเองได้
4. **coaches_delete_own_announcements**: โค้ชลบประกาศของตัวเองได้
5. **athletes_view_club_announcements**: นักกีฬาดูประกาศจากโค้ชในสโมสรได้

### Announcement Reads Table
1. **users_view_own_reads**: ผู้ใช้ดูสถานะการอ่านของตัวเองได้
2. **users_mark_as_read**: ผู้ใช้ทำเครื่องหมายอ่านได้
3. **coaches_view_announcement_reads**: โค้ชดูสถิติการอ่านประกาศของตัวเองได้

## API Routes & Actions

### Server Actions (`lib/coach/announcement-actions.ts`)

#### `createAnnouncement(input)`
สร้างประกาศใหม่
```typescript
interface CreateAnnouncementInput {
  title: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  target_audience?: 'all' | 'athletes' | 'specific';
  is_pinned?: boolean;
  expires_at?: string;
}
```

#### `updateAnnouncement(input)`
อัปเดตประกาศ
```typescript
interface UpdateAnnouncementInput extends Partial<CreateAnnouncementInput> {
  id: string;
}
```

#### `deleteAnnouncement(id: string)`
ลบประกาศ

#### `getCoachAnnouncements()`
ดึงประกาศทั้งหมดของโค้ช

#### `markAnnouncementAsRead(announcementId: string)`
ทำเครื่องหมายว่าอ่านแล้ว

## UI Components

### สำหรับโค้ช
1. **CreateAnnouncementDialog** - Dialog สำหรับสร้างประกาศ
2. **AnnouncementList** - แสดงรายการประกาศพร้อมจัดการ

### สำหรับนักกีฬา
1. **AnnouncementCard** - Card แสดงประกาศแต่ละรายการ

## หน้าเว็บ

### โค้ช
- `/dashboard/coach` - แสดงเมนูประกาศในหมวด "การจัดการสมาชิก"
- `/dashboard/coach/announcements` - หน้าจัดการประกาศทั้งหมด

### นักกีฬา
- `/dashboard/athlete` - แสดงประกาศล่าสุด 3 รายการ
- `/dashboard/athlete/announcements` - หน้าดูประกาศทั้งหมด

## การใช้งาน

### โค้ชสร้างประกาศ
1. เข้าหน้า Dashboard โค้ช
2. คลิก "ประกาศแจ้งเตือน" ในหมวดการจัดการสมาชิก
3. คลิกปุ่ม "สร้างประกาศ"
4. กรอกข้อมูล:
   - หัวข้อประกาศ (3-200 ตัวอักษร)
   - รายละเอียด (10-5000 ตัวอักษร)
   - ระดับความสำคัญ
   - ปักหมุด (ถ้าต้องการ)
5. คลิก "สร้างประกาศ"

### นักกีฬาดูประกาศ
1. เข้าหน้า Dashboard นักกีฬา
2. ดูประกาศล่าสุดในส่วน "ประกาศจากโค้ช"
3. คลิก "ดูทั้งหมด" เพื่อดูประกาศทั้งหมด
4. คลิกที่ประกาศเพื่ออ่านเต็ม (จะทำเครื่องหมายอ่านอัตโนมัติ)

## ระดับความสำคัญ

| Priority | สี | การใช้งาน |
|----------|-----|-----------|
| `low` | เทา | ข้อมูลทั่วไป |
| `normal` | น้ำเงิน | ประกาศปกติ |
| `high` | ส้ม | ข้อมูลสำคัญ |
| `urgent` | แดง | เร่งด่วนมาก |

## Migration Script

ไฟล์: `scripts/55-drop-and-create-announcements.sql`

รัน migration:
```bash
./scripts/run-sql-via-api.sh scripts/55-drop-and-create-announcements.sql
```

## ตัวอย่างการใช้งาน

### สร้างประกาศเร่งด่วน
```typescript
await createAnnouncement({
  title: 'ยกเลิกการฝึกซ้อมวันพรุ่งนี้',
  message: 'เนื่องจากสนามไม่พร้อมใช้งาน การฝึกซ้อมวันพรุ่งนี้จึงต้องยกเลิก',
  priority: 'urgent',
  is_pinned: true,
});
```

### ดึงประกาศที่ยังไม่อ่าน
```typescript
const { data: announcements } = await supabase
  .from('announcements')
  .select(`
    *,
    announcement_reads!left(user_id)
  `)
  .is('announcement_reads.user_id', null);
```

## การพัฒนาต่อ

### คุณสมบัติที่อาจเพิ่มในอนาคต
- [ ] การแจ้งเตือนแบบ Push Notification
- [ ] การกำหนดกลุ่มเป้าหมายเฉพาะ (specific athletes)
- [ ] การแนบไฟล์/รูปภาพในประกาศ
- [ ] การตั้งเวลาเผยแพร่ประกาศ (scheduled announcements)
- [ ] การแสดงสถิติการอ่านแบบละเอียด
- [ ] การส่งประกาศผ่าน Email/SMS

## สรุป

ระบบประกาศแจ้งเตือนช่วยให้การสื่อสารระหว่างโค้ชและนักกีฬามีประสิทธิภาพมากขึ้น โดยมี UI ที่ทันสมัยแบบ Native App และระบบติดตามการอ่านที่ชัดเจน
