// ============================================================
// database.types.ts — GENERATED from the live Supabase schema.
// Source of truth for DB shapes. Regenerate via the Supabase MCP
// (generate_typescript_types) or `supabase gen types typescript`.
// Do not edit by hand.
//
// Adopt incrementally: type the Supabase clients as
//   createClient<Database>(...) / createBrowserClient<Database>(...)
// then replace `as any` on query results with Tables<'x'> etc.
// ============================================================
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string | null
          created_at: string
          id: string
          instructions: string | null
          is_active: boolean
          materials: string[] | null
          name: string
          order_index: number
          task_id: string
          type: string | null
          updated_at: string
        }
        Insert: {
          activity_type?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          materials?: string[] | null
          name: string
          order_index?: number
          task_id: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          activity_type?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          materials?: string[] | null
          name?: string
          order_index?: number
          task_id?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_inbox: {
        Row: {
          created_at: string
          id: string
          lesson: Json
          saved: boolean
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson: Json
          saved?: boolean
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson?: Json
          saved?: boolean
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_inbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          candidate_tokens: number | null
          created_at: string
          error: string | null
          id: string
          latency_ms: number | null
          model: string | null
          operation: string
          prompt_tokens: number | null
          status: string
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          candidate_tokens?: number | null
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          operation: string
          prompt_tokens?: number | null
          status?: string
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          candidate_tokens?: number | null
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          operation?: string
          prompt_tokens?: number | null
          status?: string
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_results: {
        Row: {
          created_at: string
          feedback: string | null
          graded_by: string
          grader_id: string | null
          id: string
          max_score: number
          passed: boolean | null
          rubric: Json
          score: number | null
          submission_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          graded_by?: string
          grader_id?: string | null
          id?: string
          max_score?: number
          passed?: boolean | null
          rubric?: Json
          score?: number | null
          submission_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          graded_by?: string
          grader_id?: string | null
          id?: string
          max_score?: number
          passed?: boolean | null
          rubric?: Json
          score?: number | null
          submission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_grader_id_fkey"
            columns: ["grader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      child_subjects: {
        Row: {
          child_id: string
          custom_order: number
          enrolled_at: string
          id: string
          is_active: boolean
          subject_id: string
        }
        Insert: {
          child_id: string
          custom_order?: number
          enrolled_at?: string
          id?: string
          is_active?: boolean
          subject_id: string
        }
        Update: {
          child_id?: string
          custom_order?: number
          enrolled_at?: string
          id?: string
          is_active?: boolean
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_subjects_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      child_topics: {
        Row: {
          child_id: string
          custom_order: number
          enrolled_at: string
          enrollment_source: string
          id: string
          is_active: boolean
          target_completion_date: string | null
          topic_id: string
        }
        Insert: {
          child_id: string
          custom_order?: number
          enrolled_at?: string
          enrollment_source?: string
          id?: string
          is_active?: boolean
          target_completion_date?: string | null
          topic_id: string
        }
        Update: {
          child_id?: string
          custom_order?: number
          enrolled_at?: string
          enrollment_source?: string
          id?: string
          is_active?: boolean
          target_completion_date?: string | null
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_topics_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          created_at: string
          date_of_birth: string | null
          family_id: string | null
          grade_level: string
          interests: string[]
          learning_style: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          family_id?: string | null
          grade_level: string
          interests?: string[]
          learning_style?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          family_id?: string | null
          grade_level?: string
          interests?: string[]
          learning_style?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          error_message: string | null
          id: string
          recipient: string | null
          sent_at: string | null
          status: string
          tasks_learned_count: number | null
          tasks_pending_count: number | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          recipient?: string | null
          sent_at?: string | null
          status: string
          tasks_learned_count?: number | null
          tasks_pending_count?: number | null
        }
        Update: {
          error_message?: string | null
          id?: string
          recipient?: string | null
          sent_at?: string | null
          status?: string
          tasks_learned_count?: number | null
          tasks_pending_count?: number | null
        }
        Relationships: []
      }
      families: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_invitations: {
        Row: {
          code: string
          created_at: string
          created_by: string
          email: string
          expires_at: string
          family_id: string
          id: string
          is_used: boolean
          role: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          email: string
          expires_at?: string
          family_id: string
          id?: string
          is_used?: boolean
          role?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          family_id?: string
          id?: string
          is_used?: boolean
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invitations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string
          family_id: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          child_id: string
          created_at: string
          created_by: string | null
          id: string
          status: string
          title: string
          updated_at: string
          week_start_date: string | null
        }
        Insert: {
          child_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          week_start_date?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          week_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          family_id: string | null
          id: string
          is_admin: boolean
          is_approved: boolean
          is_onboarded: boolean
          is_super_admin: boolean
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          family_id?: string | null
          id: string
          is_admin?: boolean
          is_approved?: boolean
          is_onboarded?: boolean
          is_super_admin?: boolean
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          family_id?: string | null
          id?: string
          is_admin?: boolean
          is_approved?: boolean
          is_onboarded?: boolean
          is_super_admin?: boolean
          preferences?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_sessions: {
        Row: {
          child_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          plan_id: string | null
          scheduled_date: string
          start_time: string | null
          status: string
          task_id: string | null
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          child_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          scheduled_date: string
          start_time?: string | null
          status?: string
          task_id?: string | null
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          child_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          scheduled_date?: string
          start_time?: string | null
          status?: string
          task_id?: string | null
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sessions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string
          development_domain: string
          created_at: string
          created_by: string | null
          description: string | null
          embedding: string | null
          estimated_weeks: number | null
          grade_levels: string[] | null
          id: string
          is_active: boolean
          is_global: boolean | null
          name: string
          order_index: number
          subject_type: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          color?: string
          development_domain?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          embedding?: string | null
          estimated_weeks?: number | null
          grade_levels?: string[] | null
          id?: string
          is_active?: boolean
          is_global?: boolean | null
          name: string
          order_index?: number
          subject_type?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          color?: string
          development_domain?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          embedding?: string | null
          estimated_weeks?: number | null
          grade_levels?: string[] | null
          id?: string
          is_active?: boolean
          is_global?: boolean | null
          name?: string
          order_index?: number
          subject_type?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          attachment_url: string | null
          child_id: string
          content: string | null
          created_at: string
          id: string
          session_id: string | null
          status: string
          submitted_at: string
          submitted_by: string | null
          task_id: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          child_id: string
          content?: string | null
          created_at?: string
          id?: string
          session_id?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          task_id: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          child_id?: string
          content?: string | null
          created_at?: string
          id?: string
          session_id?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "scheduled_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_queue: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          method: string
          payload: Json
          synced_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          method: string
          payload: Json
          synced_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          method?: string
          payload?: Json
          synced_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      task_progress: {
        Row: {
          child_id: string
          created_at: string
          embedding: string | null
          id: string
          interest_level: string | null
          is_active: boolean
          is_scheduled_this_week: boolean
          last_practiced_at: string | null
          learned_count: number
          learning_stage: Database["public"]["Enums"]["learning_stage"]
          mastery_score: number | null
          next_due_at: string | null
          notes: string | null
          parent_rating: number | null
          repeat_interval: number | null
          session_count: number | null
          target_count: number
          task_id: string
          time_spent_minutes: number | null
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          embedding?: string | null
          id?: string
          interest_level?: string | null
          is_active?: boolean
          is_scheduled_this_week?: boolean
          last_practiced_at?: string | null
          learned_count?: number
          learning_stage?: Database["public"]["Enums"]["learning_stage"]
          mastery_score?: number | null
          next_due_at?: string | null
          notes?: string | null
          parent_rating?: number | null
          repeat_interval?: number | null
          session_count?: number | null
          target_count?: number
          task_id: string
          time_spent_minutes?: number | null
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          embedding?: string | null
          id?: string
          interest_level?: string | null
          is_active?: boolean
          is_scheduled_this_week?: boolean
          last_practiced_at?: string | null
          learned_count?: number
          learning_stage?: Database["public"]["Enums"]["learning_stage"]
          mastery_score?: number | null
          next_due_at?: string | null
          notes?: string | null
          parent_rating?: number | null
          repeat_interval?: number | null
          session_count?: number | null
          target_count?: number
          task_id?: string
          time_spent_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_progress_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_progress_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          age_group: string | null
          assessment_criteria: string | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          embedding: string | null
          estimated_minutes: number | null
          id: string
          instructions: string | null
          is_active: boolean
          is_assessment: boolean | null
          learning_objective: string | null
          materials_needed: string[] | null
          name: string
          order_index: number
          parent_guide: string | null
          resources: Json | null
          source_type: string
          task_type: string | null
          topic_id: string
          updated_at: string
        }
        Insert: {
          age_group?: string | null
          assessment_criteria?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          embedding?: string | null
          estimated_minutes?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          is_assessment?: boolean | null
          learning_objective?: string | null
          materials_needed?: string[] | null
          name: string
          order_index?: number
          parent_guide?: string | null
          resources?: Json | null
          source_type?: string
          task_type?: string | null
          topic_id: string
          updated_at?: string
        }
        Update: {
          age_group?: string | null
          assessment_criteria?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          embedding?: string | null
          estimated_minutes?: number | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          is_assessment?: boolean | null
          learning_objective?: string | null
          materials_needed?: string[] | null
          name?: string
          order_index?: number
          parent_guide?: string | null
          resources?: Json | null
          source_type?: string
          task_type?: string | null
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          age_group: string | null
          bloom_level: string | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          embedding: string | null
          estimated_hours: number | null
          grade_level_range: string | null
          id: string
          is_active: boolean
          keywords: string[] | null
          learning_objectives: string[] | null
          order_index: number
          prerequisites: string[] | null
          subject_id: string
          title: string
          updated_at: string
        }
        Insert: {
          age_group?: string | null
          bloom_level?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          embedding?: string | null
          estimated_hours?: number | null
          grade_level_range?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          learning_objectives?: string[] | null
          order_index?: number
          prerequisites?: string[] | null
          subject_id: string
          title: string
          updated_at?: string
        }
        Update: {
          age_group?: string | null
          bloom_level?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          embedding?: string | null
          estimated_hours?: number | null
          grade_level_range?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          learning_objectives?: string[] | null
          order_index?: number
          prerequisites?: string[] | null
          subject_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memories: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_parent_to_my_family: {
        Args: { parent_email: string }
        Returns: {
          member_email: string
          member_family_id: string
          member_id: string
          member_role: string
          member_user_id: string
        }[]
      }
      approve_user: { Args: { target_user_id: string }; Returns: undefined }
      assign_missing_tasks_to_children: { Args: never; Returns: undefined }
      assign_tasks_to_child: {
        Args: { p_child_id: string; p_task_ids: string[] }
        Returns: Json
      }
      cancel_family_invitation: {
        Args: { invitation_id: string }
        Returns: undefined
      }
      complete_onboarding: { Args: never; Returns: undefined }
      create_family_invitation: {
        Args: { invite_code: string; invite_email: string }
        Returns: Json
      }
      create_family_workspace: {
        Args: { family_name: string }
        Returns: {
          created_by: string
          id: string
          name: string
        }[]
      }
      get_all_profiles: {
        Args: never
        Returns: {
          created_at: string
          display_name: string | null
          family_id: string | null
          id: string
          is_admin: boolean
          is_approved: boolean
          is_onboarded: boolean
          is_super_admin: boolean
          preferences: Json | null
          updated_at: string
        }[]
      }
      is_family_member: { Args: { target_family_id: string }; Returns: boolean }
      is_family_owner: { Args: { target_family_id: string }; Returns: boolean }
      join_family_with_code: { Args: { joining_code: string }; Returns: Json }
      leave_family: { Args: never; Returns: undefined }
      list_my_family_invitations: {
        Args: never
        Returns: {
          code: string
          created_at: string
          email: string
          expires_at: string
          family_id: string
          id: string
          is_used: boolean
          role: string
        }[]
      }
      list_my_family_members: {
        Args: never
        Returns: {
          display_name: string
          email: string
          id: string
          is_active: boolean
          role: string
          user_id: string
        }[]
      }
      match_subjects: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          description: string
          id: string
          name: string
          similarity: number
        }[]
      }
      match_tasks: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
          topic_id_filter: string
        }
        Returns: {
          id: string
          name: string
          similarity: number
        }[]
      }
      match_topics: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
          subject_id_filter: string
        }
        Returns: {
          id: string
          similarity: number
          title: string
        }[]
      }
      match_user_memories: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
          user_id_filter: string
        }
        Returns: {
          content: string
          id: string
          similarity: number
        }[]
      }
      remove_family_member: {
        Args: { member_user_id: string }
        Returns: undefined
      }
      user_family_id: { Args: never; Returns: string }
    }
    Enums: {
      learning_stage:
        | "Not_Started"
        | "Introduced"
        | "Practicing"
        | "Comfortable"
        | "Confident"
        | "Needs_Practice"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      learning_stage: [
        "Not_Started",
        "Introduced",
        "Practicing",
        "Comfortable",
        "Confident",
        "Needs_Practice",
      ],
    },
  },
} as const
