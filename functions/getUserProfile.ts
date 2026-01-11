import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from request
    const { userId } = await req.json();
    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Use service role to fetch any user's profile
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    const user = users[0];

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    return Response.json({ user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});