import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function jsonResponse(status: number, body: Record<string, string>){
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
}

Deno.serve(async request => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }
    if (request.method !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed.' })
    }

    const authorization = request.headers.get('Authorization')
    const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!accessToken) {
        return jsonResponse(401, { error: 'Authentication required.' })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Required Supabase Edge Function environment variables are missing.')
        return jsonResponse(500, { error: 'Account deletion is not configured.' })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
    const { data: { user }, error: authenticationError } =
        await adminClient.auth.getUser(accessToken)
    if (authenticationError || !user) {
        return jsonResponse(401, { error: 'Authentication required.' })
    }

    const { error: deletionError } = await adminClient.auth.admin.deleteUser(user.id)
    if (deletionError) {
        console.error('Supabase Auth user deletion failed.', deletionError)
        return jsonResponse(500, { error: 'Account deletion failed.' })
    }

    return jsonResponse(200, { success: 'Account and associated data deleted.' })
})
