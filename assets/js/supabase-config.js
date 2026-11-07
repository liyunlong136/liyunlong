/* Supabase 配置：填上 Project URL 和 anon public key。
   anon key 是公开的，但必须在 Supabase 里开启 RLS 并配置策略；
   绝对不要把 service_role key 放到前端。 */
window.MP_SUPABASE = {
  url: '',        // 例如 https://abcdefgh.supabase.co
  anonKey: '',    // sb_publishable_... 或 anon public key
  table: 'ratings'
};
