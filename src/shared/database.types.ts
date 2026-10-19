
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "asociaciones": {
                  Row: {
                    "id": string,"nombre": string,"zona_horaria": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"nombre": string,"zona_horaria"?: string
                  }
                  Update: {
                    "id"?: string,"nombre"?: string,"zona_horaria"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cargos": {
                  Row: {
                    "asociacion_id": string | null,"distrito_id": string | null,"es_secretaria": boolean,"funcion": string | null,"id": string,"iglesia_id": string | null,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asociacion_id"?: string | null,"distrito_id"?: string | null,"es_secretaria"?: boolean,"funcion"?: string | null,"id"?: string,"iglesia_id"?: string | null,"usuario_id": string
                  }
                  Update: {
                    "asociacion_id"?: string | null,"distrito_id"?: string | null,"es_secretaria"?: boolean,"funcion"?: string | null,"id"?: string,"iglesia_id"?: string | null,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cargos_asociacion_id_fkey"
      columns: ["asociacion_id"]
isOneToOne: false
      referencedRelation: "asociaciones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cargos_distrito_id_fkey"
      columns: ["distrito_id"]
isOneToOne: false
      referencedRelation: "distritos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cargos_iglesia_id_fkey"
      columns: ["iglesia_id"]
isOneToOne: false
      referencedRelation: "iglesias"
      referencedColumns: ["id"]
    }
                  ]
                },"chat_consentimientos": {
                  Row: {
                    "aceptado_en": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aceptado_en"?: string,"usuario_id": string
                  }
                  Update: {
                    "aceptado_en"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"chat_consultas": {
                  Row: {
                    "cantidad": number,"dia": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad"?: number,"dia": string,"usuario_id": string
                  }
                  Update: {
                    "cantidad"?: number,"dia"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"chat_gastos": {
                  Row: {
                    "mes": string,"usd": number
                  }
                  ComputedFields: never
                  Insert: {
                    "mes": string,"usd"?: number
                  }
                  Update: {
                    "mes"?: string,"usd"?: number
                  }
                  Relationships: [
                    
                  ]
                },"distritos": {
                  Row: {
                    "asociacion_id": string,"id": string,"nombre": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asociacion_id": string,"id"?: string,"nombre": string
                  }
                  Update: {
                    "asociacion_id"?: string,"id"?: string,"nombre"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "distritos_asociacion_id_fkey"
      columns: ["asociacion_id"]
isOneToOne: false
      referencedRelation: "asociaciones"
      referencedColumns: ["id"]
    }
                  ]
                },"eventos": {
                  Row: {
                    "alcance": Database["public"]['Enums']["alcance"],"descripcion": string | null,"duenio_asociacion_id": string | null,"duenio_distrito_id": string | null,"duenio_iglesia_id": string | null,"enfasis": Database["public"]['Enums']["enfasis"] | null,"fecha_fin": string | null,"fin_de_serie": string | null,"hora": string,"id": string,"lugar": string | null,"lugar_id": string | null,"repeticion": Database["public"]['Enums']["repeticion"],"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alcance": Database["public"]['Enums']["alcance"],"descripcion"?: string | null,"duenio_asociacion_id"?: string | null,"duenio_distrito_id"?: string | null,"duenio_iglesia_id"?: string | null,"enfasis"?: Database["public"]['Enums']["enfasis"] | null,"fecha_fin"?: string | null,"fin_de_serie"?: string | null,"hora": string,"id"?: string,"lugar"?: string | null,"lugar_id"?: string | null,"repeticion"?: Database["public"]['Enums']["repeticion"],"titulo": string
                  }
                  Update: {
                    "alcance"?: Database["public"]['Enums']["alcance"],"descripcion"?: string | null,"duenio_asociacion_id"?: string | null,"duenio_distrito_id"?: string | null,"duenio_iglesia_id"?: string | null,"enfasis"?: Database["public"]['Enums']["enfasis"] | null,"fecha_fin"?: string | null,"fin_de_serie"?: string | null,"hora"?: string,"id"?: string,"lugar"?: string | null,"lugar_id"?: string | null,"repeticion"?: Database["public"]['Enums']["repeticion"],"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "eventos_duenio_asociacion_id_fkey"
      columns: ["duenio_asociacion_id"]
isOneToOne: false
      referencedRelation: "asociaciones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "eventos_duenio_distrito_id_fkey"
      columns: ["duenio_distrito_id"]
isOneToOne: false
      referencedRelation: "distritos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "eventos_duenio_iglesia_id_fkey"
      columns: ["duenio_iglesia_id"]
isOneToOne: false
      referencedRelation: "iglesias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "eventos_lugar_id_fkey"
      columns: ["lugar_id"]
isOneToOne: false
      referencedRelation: "lugares"
      referencedColumns: ["id"]
    }
                  ]
                },"eventos_fechas": {
                  Row: {
                    "evento_id": string,"fecha": string
                  }
                  ComputedFields: never
                  Insert: {
                    "evento_id": string,"fecha": string
                  }
                  Update: {
                    "evento_id"?: string,"fecha"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "eventos_fechas_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    }
                  ]
                },"iglesias": {
                  Row: {
                    "direccion": string,"distrito_id": string,"excluida_del_buscador": boolean,"id": string,"localidad": string,"nombre": string
                  }
                  ComputedFields: never
                  Insert: {
                    "direccion": string,"distrito_id": string,"excluida_del_buscador"?: boolean,"id"?: string,"localidad": string,"nombre": string
                  }
                  Update: {
                    "direccion"?: string,"distrito_id"?: string,"excluida_del_buscador"?: boolean,"id"?: string,"localidad"?: string,"nombre"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "iglesias_distrito_id_fkey"
      columns: ["distrito_id"]
isOneToOne: false
      referencedRelation: "distritos"
      referencedColumns: ["id"]
    }
                  ]
                },"iglesias_sumadas": {
                  Row: {
                    "evento_id": string,"iglesia_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "evento_id": string,"iglesia_id": string
                  }
                  Update: {
                    "evento_id"?: string,"iglesia_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "iglesias_sumadas_evento_id_fkey"
      columns: ["evento_id"]
isOneToOne: false
      referencedRelation: "eventos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "iglesias_sumadas_iglesia_id_fkey"
      columns: ["iglesia_id"]
isOneToOne: false
      referencedRelation: "iglesias"
      referencedColumns: ["id"]
    }
                  ]
                },"lugares": {
                  Row: {
                    "duenio_asociacion_id": string | null,"duenio_distrito_id": string | null,"duenio_iglesia_id": string | null,"id": string,"nombre": string
                  }
                  ComputedFields: never
                  Insert: {
                    "duenio_asociacion_id"?: string | null,"duenio_distrito_id"?: string | null,"duenio_iglesia_id"?: string | null,"id"?: string,"nombre": string
                  }
                  Update: {
                    "duenio_asociacion_id"?: string | null,"duenio_distrito_id"?: string | null,"duenio_iglesia_id"?: string | null,"id"?: string,"nombre"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lugares_duenio_asociacion_id_fkey"
      columns: ["duenio_asociacion_id"]
isOneToOne: false
      referencedRelation: "asociaciones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lugares_duenio_distrito_id_fkey"
      columns: ["duenio_distrito_id"]
isOneToOne: false
      referencedRelation: "distritos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lugares_duenio_iglesia_id_fkey"
      columns: ["duenio_iglesia_id"]
isOneToOne: false
      referencedRelation: "iglesias"
      referencedColumns: ["id"]
    }
                  ]
                },"perfiles": {
                  Row: {
                    "nombre": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "nombre": string,"usuario_id": string
                  }
                  Update: {
                    "nombre"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "borrar_evento":
{ Args: { "evento_id": string }; Returns: undefined
                           },
"can_read_cargo":
{ Args: { "cargo_asociacion_id": string,"cargo_distrito_id": string,"cargo_iglesia_id": string }; Returns: boolean
                           },
"cargos_abarcan_duenio":
{ Args: { "duenio_asociacion_id": string,"duenio_distrito_id": string,"duenio_iglesia_id": string }; Returns: boolean
                           },
"delete_own_usuario":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"get_usuario_emails":
{ Args: Record<PropertyKey, never>; Returns: {
              "email": string,"usuario_id": string
            }[]
                           },
"guardar_evento":
{ Args: { "alcance": Database["public"]['Enums']["alcance"],"descripcion"?: string,"duenio_asociacion_id"?: string,"duenio_distrito_id"?: string,"duenio_iglesia_id"?: string,"enfasis"?: Database["public"]['Enums']["enfasis"],"evento_id"?: string,"fecha_fin"?: string,"fechas": (string)[],"fin_de_serie"?: string,"hora": string,"lugar"?: string,"lugar_id"?: string,"nuevo_evento_id"?: string,"repeticion": Database["public"]['Enums']["repeticion"],"titulo": string }; Returns: string
                           },
"guardar_lugar":
{ Args: { "duenio_asociacion_id"?: string,"duenio_distrito_id"?: string,"duenio_iglesia_id"?: string,"nombre": string }; Returns: {
              "duenio_asociacion_id": string | null,
"duenio_distrito_id": string | null,
"duenio_iglesia_id": string | null,
"id": string,
"nombre": string
            }
                          SetofOptions: {
        from: "*"
        to: "lugares"
        isOneToOne: true
        isSetofReturn: false
      } },
"lugar_nombre_key":
{ Args: { "nombre": string }; Returns: string
                           },
"registrar_consulta":
{ Args: { "costo_usd": number,"dia": string,"mes": string,"usuario_id": string }; Returns: {
              "consultas_del_dia": number,"gasto_del_mes": number
            }[]
                           }
          }
          Enums: {
            "alcance": "iglesia"|"distrito"|"asociacion","enfasis": "identidad"|"liderazgo"|"nuevas_generaciones"|"discipulado","repeticion": "ninguna"|"semanal"|"mensual"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "alcance": ["iglesia", "distrito", "asociacion"],"enfasis": ["identidad", "liderazgo", "nuevas_generaciones", "discipulado"],"repeticion": ["ninguna", "semanal", "mensual"]
          }
        }
} as const
