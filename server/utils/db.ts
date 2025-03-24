import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../database/schema'

export { sql, eq, and, or } from 'drizzle-orm'

export const tables = schema

export function useDB() {
  return drizzle(hubDatabase(), { schema })
}

export type SupervisorReport = typeof tables.supervisorReports.$inferSelect
export type CreateSupervisorReportPayload = typeof tables.supervisorReports.$inferInsert
export type UpdateSupervisorReportPayload = Partial<Omit<CreateSupervisorReportPayload, 'id'>>

export type ReviewerReport = typeof tables.reviewerReports.$inferSelect
export type CreateReviewerReportPayload = typeof tables.reviewerReports.$inferInsert
export type UpdateReviewerReportPayload = Partial<Omit<CreateReviewerReportPayload, 'id'>>

export type StudentRecord = typeof tables.studentRecords.$inferSelect // for SELECT operations
export type NewStudentRecord = typeof tables.studentRecords.$inferInsert // for INSERT operations

export type DocumentRecord = typeof tables.documents.$inferSelect
export type VideoRecord = typeof tables.videos.$inferSelect

export type Todo = typeof tables.todos.$inferSelect
