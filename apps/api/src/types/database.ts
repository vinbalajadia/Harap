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
    }
    Views: Record<string, never>
  }
}
