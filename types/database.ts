export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          attended: boolean
          class_id: string
          created_at: string
          rsvp_status: Database["public"]["Enums"]["rsvp_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attended?: boolean
          class_id: string
          created_at?: string
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attended?: boolean
          class_id?: string
          created_at?: string
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_deleted: boolean
          legacy_id: string | null
          location: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_deleted?: boolean
          legacy_id?: string | null
          location: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_deleted?: boolean
          legacy_id?: string | null
          location?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          capacity: number | null
          content: string | null
          course_id: string
          created_at: string
          date: string | null
          description: string | null
          end_time: string | null
          id: string
          is_deleted: boolean
          legacy_id: string | null
          objectives: string | null
          start_time: string | null
          title: string | null
          updated_at: string
          video_links: Json
        }
        Insert: {
          capacity?: number | null
          content?: string | null
          course_id: string
          created_at?: string
          date?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_deleted?: boolean
          legacy_id?: string | null
          objectives?: string | null
          start_time?: string | null
          title?: string | null
          updated_at?: string
          video_links?: Json
        }
        Update: {
          capacity?: number | null
          content?: string | null
          course_id?: string
          created_at?: string
          date?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_deleted?: boolean
          legacy_id?: string | null
          objectives?: string | null
          start_time?: string | null
          title?: string | null
          updated_at?: string
          video_links?: Json
        }
        Relationships: [
          {
            foreignKeyName: "classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_members: {
        Row: {
          active: boolean
          course_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          enrollment_id: string | null
          id: string
          joined_at: string
          last_overdue_notification_at: string | null
          last_pending_notification_at: string | null
          legacy_id: string | null
          next_payment_date: string | null
          payment_status: Database["public"]["Enums"]["payment_standing"]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          course_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          enrollment_id?: string | null
          id?: string
          joined_at?: string
          last_overdue_notification_at?: string | null
          last_pending_notification_at?: string | null
          legacy_id?: string | null
          next_payment_date?: string | null
          payment_status?: Database["public"]["Enums"]["payment_standing"]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          course_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          enrollment_id?: string | null
          id?: string
          joined_at?: string
          last_overdue_notification_at?: string | null
          last_pending_notification_at?: string | null
          legacy_id?: string | null
          next_payment_date?: string | null
          payment_status?: Database["public"]["Enums"]["payment_standing"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_members_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_members_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          day: Database["public"]["Enums"]["weekday"] | null
          description: string
          id: string
          is_deleted: boolean
          legacy_id: string | null
          level: number
          start_date: string | null
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          day?: Database["public"]["Enums"]["weekday"] | null
          description?: string
          id?: string
          is_deleted?: boolean
          legacy_id?: string | null
          level?: number
          start_date?: string | null
          teacher_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          day?: Database["public"]["Enums"]["weekday"] | null
          description?: string
          id?: string
          is_deleted?: boolean
          legacy_id?: string | null
          level?: number
          start_date?: string | null
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          annual_fee_year: number | null
          assigned_class_id: string | null
          class_assigned_at: string | null
          class_assigned_by: string | null
          course_id: string
          id: string
          legacy_id: string | null
          payment_proof_deleted_at: string | null
          payment_proof_path: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: Database["public"]["Enums"]["enrollment_source"]
          status: Database["public"]["Enums"]["review_status"]
          submitted_at: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_fee_year?: number | null
          assigned_class_id?: string | null
          class_assigned_at?: string | null
          class_assigned_by?: string | null
          course_id: string
          id?: string
          legacy_id?: string | null
          payment_proof_deleted_at?: string | null
          payment_proof_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: Database["public"]["Enums"]["enrollment_source"]
          status?: Database["public"]["Enums"]["review_status"]
          submitted_at?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_fee_year?: number | null
          assigned_class_id?: string | null
          class_assigned_at?: string | null
          class_assigned_by?: string | null
          course_id?: string
          id?: string
          legacy_id?: string | null
          payment_proof_deleted_at?: string | null
          payment_proof_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: Database["public"]["Enums"]["enrollment_source"]
          status?: Database["public"]["Enums"]["review_status"]
          submitted_at?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_assigned_class_id_fkey"
            columns: ["assigned_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_class_assigned_by_fkey"
            columns: ["class_assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_signups: {
        Row: {
          created_at: string
          event_id: string
          id: string
          invitee_count: number
          is_free: boolean
          legacy_id: string | null
          price_per_head: number | null
          receipt_deleted_at: string | null
          receipt_path: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["signup_status"]
          total_attendees: number | null
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          invitee_count?: number
          is_free?: boolean
          legacy_id?: string | null
          price_per_head?: number | null
          receipt_deleted_at?: string | null
          receipt_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["signup_status"]
          total_attendees?: number | null
          total_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          invitee_count?: number
          is_free?: boolean
          legacy_id?: string | null
          price_per_head?: number | null
          receipt_deleted_at?: string | null
          receipt_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["signup_status"]
          total_attendees?: number | null
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_signups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_signups_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_signups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          banner_path: string | null
          capacity: number | null
          category: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_deleted: boolean
          is_public: boolean
          legacy_id: string | null
          location: string
          price: number | null
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
        }
        Insert: {
          banner_path?: string | null
          capacity?: number | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_deleted?: boolean
          is_public?: boolean
          legacy_id?: string | null
          location?: string
          price?: number | null
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
        }
        Update: {
          banner_path?: string | null
          capacity?: number | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_deleted?: boolean
          is_public?: boolean
          legacy_id?: string | null
          location?: string
          price?: number | null
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fares: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          legacy_id: string | null
          num_courses: number
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string
          id?: string
          legacy_id?: string | null
          num_courses?: number
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          legacy_id?: string | null
          num_courses?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_items: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          image_paths: string[]
          legacy_id: string | null
          name: string
          price: number
          short_description: string | null
          sku: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          image_paths?: string[]
          legacy_id?: string | null
          name: string
          price: number
          short_description?: string | null
          sku?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          image_paths?: string[]
          legacy_id?: string | null
          name?: string
          price?: number
          short_description?: string | null
          sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_broadcasts: {
        Row: {
          content: string
          created_at: string
          id: string
          legacy_id: string | null
          recipients: Database["public"]["Enums"]["audience"]
          sent_by: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          legacy_id?: string | null
          recipients: Database["public"]["Enums"]["audience"]
          sent_by?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          legacy_id?: string | null
          recipients?: Database["public"]["Enums"]["audience"]
          sent_by?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_broadcasts_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_drafts: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          legacy_id: string | null
          recipients: Database["public"]["Enums"]["audience"]
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          legacy_id?: string | null
          recipients: Database["public"]["Enums"]["audience"]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          legacy_id?: string | null
          recipients?: Database["public"]["Enums"]["audience"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_courses: {
        Row: {
          course_id: string
          payment_id: string
        }
        Insert: {
          course_id: string
          payment_id: string
        }
        Update: {
          course_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_courses_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          annual_fee_year: number | null
          created_at: string
          days_late: number
          id: string
          is_late: boolean
          late_fare: number
          legacy_id: string | null
          monthly_fare: number
          proof_deleted_at: string | null
          proof_path: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["review_status"]
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_fee_year?: number | null
          created_at?: string
          days_late?: number
          id?: string
          is_late?: boolean
          late_fare?: number
          legacy_id?: string | null
          monthly_fare: number
          proof_deleted_at?: string | null
          proof_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_fee_year?: number | null
          created_at?: string
          days_late?: number
          id?: string
          is_late?: boolean
          late_fare?: number
          legacy_id?: string | null
          monthly_fare?: number
          proof_deleted_at?: string | null
          proof_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          consent_accepted: boolean
          consent_accepted_at: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_name: string
          name: string
          phone: string | null
          photo_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          consent_accepted?: boolean
          consent_accepted_at?: string | null
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          last_name?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          consent_accepted?: boolean
          consent_accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_name?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_answers: {
        Row: {
          question_id: string
          rating: number | null
          response_id: string
          text_value: string | null
        }
        Insert: {
          question_id: string
          rating?: number | null
          response_id: string
          text_value?: string | null
        }
        Update: {
          question_id?: string
          rating?: number | null
          response_id?: string
          text_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          id: string
          legacy_key: string | null
          options: string[] | null
          position: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          required: boolean
          survey_id: string
        }
        Insert: {
          id?: string
          legacy_key?: string | null
          options?: string[] | null
          position: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          required?: boolean
          survey_id: string
        }
        Update: {
          id?: string
          legacy_key?: string | null
          options?: string[] | null
          position?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          required?: boolean
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          completion_time_seconds: number | null
          id: string
          legacy_id: string | null
          submitted_at: string
          survey_id: string
          user_id: string
        }
        Insert: {
          completion_time_seconds?: number | null
          id?: string
          legacy_id?: string | null
          submitted_at?: string
          survey_id: string
          user_id: string
        }
        Update: {
          completion_time_seconds?: number | null
          id?: string
          legacy_id?: string | null
          submitted_at?: string
          survey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          is_deleted: boolean
          legacy_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          legacy_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          legacy_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      mark_receipts_purged: { Args: { p_paths: string[] }; Returns: undefined }
      receipts_due_for_purge: {
        Args: { p_limit?: number; p_retention?: string }
        Returns: {
          path: string
        }[]
      }
      send_broadcast: {
        Args: {
          p_content: string
          p_recipients: Database["public"]["Enums"]["audience"]
          p_title: string
        }
        Returns: number
      }
    }
    Enums: {
      audience: "all" | "user" | "teacher"
      enrollment_source: "self" | "manual"
      event_status: "draft" | "published"
      payment_standing: "ok" | "pending" | "late"
      question_type: "rating" | "multiple_choice" | "text"
      review_status: "pending" | "approved" | "rejected"
      rsvp_status: "leaders" | "followers" | "no_asistira"
      signup_status:
        | "pending"
        | "approved"
        | "rejected"
        | "canceled"
        | "autoApproved"
      user_role: "user" | "teacher" | "admin"
      weekday:
        | "lunes"
        | "martes"
        | "miércoles"
        | "jueves"
        | "viernes"
        | "sábado"
        | "domingo"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      audience: ["all", "user", "teacher"],
      enrollment_source: ["self", "manual"],
      event_status: ["draft", "published"],
      payment_standing: ["ok", "pending", "late"],
      question_type: ["rating", "multiple_choice", "text"],
      review_status: ["pending", "approved", "rejected"],
      rsvp_status: ["leaders", "followers", "no_asistira"],
      signup_status: [
        "pending",
        "approved",
        "rejected",
        "canceled",
        "autoApproved",
      ],
      user_role: ["user", "teacher", "admin"],
      weekday: [
        "lunes",
        "martes",
        "miércoles",
        "jueves",
        "viernes",
        "sábado",
        "domingo",
      ],
    },
  },
} as const
