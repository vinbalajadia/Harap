export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    CompositeTypes: Record<string, never>
    Enums: Record<string, never>
    Functions: Record<string, never>
    Tables: {
      profiles: {
        Insert: {
          created_at?: string
          display_name?: string | null
          experience_level?: string | null
          id: string
          interview_goal?: string | null
          onboarding_completed?: boolean
          preferred_language?: string | null
          target_role?: string | null
          updated_at?: string
        }
        Relationships: []
        Row: {
          created_at: string
          display_name: string | null
          experience_level: string | null
          id: string
          interview_goal: string | null
          onboarding_completed: boolean
          preferred_language: string | null
          target_role: string | null
          updated_at: string
        }
        Update: {
          display_name?: string | null
          experience_level?: string | null
          interview_goal?: string | null
          onboarding_completed?: boolean
          preferred_language?: string | null
          target_role?: string | null
        }
      }
      resumes: {
        Insert: {
          candidate_data?: Json | null
          confirmed_at?: string | null
          content_sha256: string
          created_at?: string
          failure_code?: string | null
          file_size_bytes: number
          id?: string
          last_analyzed_at?: string | null
          original_filename: string
          status?: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Relationships: []
        Row: {
          candidate_data: Json | null
          confirmed_at: string | null
          content_sha256: string
          created_at: string
          failure_code: string | null
          file_size_bytes: number
          id: string
          last_analyzed_at: string | null
          original_filename: string
          status: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Update: {
          candidate_data?: Json | null
          confirmed_at?: string | null
          content_sha256?: string
          failure_code?: string | null
          file_size_bytes?: number
          id?: string
          last_analyzed_at?: string | null
          original_filename?: string
          status?: string
          storage_path?: string
        }
      }
    }
    Views: Record<string, never>
  }
}
