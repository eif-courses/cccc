import { sqliteTable, integer, real, text, index } from 'drizzle-orm/sqlite-core'
import { relations, sql } from 'drizzle-orm'

export const todos = sqliteTable('todos', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull(), // GitHub Id
  title: text('title').notNull(),
  completed: integer('completed').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
})
// New table for department heads
export const departmentHeads = sqliteTable('department_heads', {
  id: integer('id').primaryKey(),
  email: text('email').notNull().unique(),
  department: text('department').notNull(),
  jobTitle: text('job_title').notNull(),
  isActive: integer('is_active').notNull().default(1),
  createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`)
}, table => ({
  emailIndex: index('department_heads_email_idx').on(table.email),
  departmentIndex: index('department_heads_department_idx').on(table.department),
  isActiveIndex: index('department_heads_is_active_idx').on(table.isActive)
}))

export const studentRecords = sqliteTable('student_records', {
  id: integer('id').primaryKey(),
  studentGroup: text('student_group').notNull(),
  finalProjectTitle: text('final_project_title').notNull().default(''),
  studentEmail: text('student_email').notNull(),
  studentName: text('student_name').notNull(),
  studentLastname: text('student_lastname').notNull(),
  studentNumber: text('student_number').notNull(),
  supervisorEmail: text('supervisor_email').notNull(),
  studyProgram: text('study_program').notNull(),
  department: text('department').notNull().default(''),
  programCode: text('program_code').notNull(),
  currentYear: integer('current_year').notNull(),
  reviewerEmail: text('reviewer_email').notNull().default(''),
  reviewerName: text('reviewer_name').notNull().default(''),
  isFavorite: integer('is_favorite').notNull().default(0)
}, table => ({
  // Remove the unique constraint
  studentEmailIndex: index('student_email_idx').on(table.studentEmail),
  supervisorEmailIndex: index('supervisor_email_idx').on(table.supervisorEmail),
  reviewerEmailIndex: index('reviewer_email_idx').on(table.reviewerEmail),
  studyProgramIndex: index('study_program_idx').on(table.studyProgram),
  departmentIndex: index('department_idx').on(table.department)
}))

export const documents = sqliteTable('documents', {
  id: integer('id').primaryKey(),
  documentType: text('document_type').notNull(),
  filePath: text('file_path').notNull(),
  uploadedDate: integer('uploaded_date').default(sql`(strftime('%s', 'now'))`),
  studentRecordId: integer('student_record_id').references(() => studentRecords.id, { onDelete: 'cascade' })
}, table => ({
  studentRecordIndex: index('documents_student_record_idx').on(table.studentRecordId)
}))

export const supervisorReports = sqliteTable('supervisor_reports', {
  id: integer('id').primaryKey(),
  studentRecordId: integer('student_record_id').references(() => studentRecords.id, { onDelete: 'cascade' }),
  supervisorComments: text('supervisor_comments').notNull().default(''),
  otherMatch: real('other_match').notNull().default(0),
  oneMatch: real('one_match').notNull().default(0),
  ownMatch: real('own_match').notNull().default(0),
  joinMatch: real('join_match').notNull().default(0),
  createdDate: integer('created_date').default(sql`(strftime('%s', 'now'))`)
}, table => ({
  studentRecordIndex: index('supervisor_reports_student_record_idx').on(table.studentRecordId)
}))

export const reviewerReports = sqliteTable('reviewer_reports', {
  id: integer('id').primaryKey(),
  studentRecordId: integer('student_record_id').references(() => studentRecords.id, { onDelete: 'cascade' }),
  grade: real('grade').notNull().default(0),
  reviewerPersonalInfo: text('reviewer_personal_info').notNull(),
  reviewFields: text('review_fields').notNull(),
  isSigned: integer('is_signed').notNull().default(0),
  createdDate: integer('created_date').default(sql`(strftime('%s', 'now'))`)
}, table => ({
  studentRecordIndex: index('reviewer_reports_student_record_idx').on(table.studentRecordId)
}))

export const videos = sqliteTable('videos', {
  id: integer('id').primaryKey(),
  studentRecordId: integer('student_record_id')
    .references(() => studentRecords.id, { onDelete: 'cascade' })
    .notNull(),
  key: text('key').notNull(),
  filename: text('filename').notNull(),
  contentType: text('content_type').notNull(),
  size: integer('size'),
  url: text('url'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull()
}, table => ({
  studentRecordIndex: index('videos_student_record_idx').on(table.studentRecordId)
}))

// Define relationships
export const departmentHeadsRelations = relations(departmentHeads, ({ many }) => ({
  // A department head can oversee multiple students in their department
  studentRecords: many(studentRecords)
}))

export const studentRecordsRelations = relations(studentRecords, ({ many, one }) => ({
  documents: many(documents),
  videos: many(videos),
  supervisorReports: many(supervisorReports),
  reviewerReports: many(reviewerReports),
  // You could add a relationship to department heads if needed:
  departmentHead: one(departmentHeads, {
    // This would link through the department field
    fields: [studentRecords.department],
    references: [departmentHeads.department]
  })
}))

export const documentsRelations = relations(documents, ({ one }) => ({
  studentRecord: one(studentRecords, {
    fields: [documents.studentRecordId],
    references: [studentRecords.id]
  })
}))

export const videosRelations = relations(videos, ({ one }) => ({
  studentRecord: one(studentRecords, {
    fields: [videos.studentRecordId],
    references: [studentRecords.id]
  })
}))

export const supervisorReportsRelations = relations(supervisorReports, ({ one }) => ({
  studentRecord: one(studentRecords, {
    fields: [supervisorReports.studentRecordId],
    references: [studentRecords.id]
  })
}))

export const reviewerReportsRelations = relations(reviewerReports, ({ one }) => ({
  studentRecord: one(studentRecords, {
    fields: [reviewerReports.studentRecordId],
    references: [studentRecords.id]
  })
}))
