import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
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
      return Response.json({ error: `User profile not found (ID: ${userId.slice(0, 8)}...)` }, { status: 404 });
    }

    // Return user profile with all necessary fields
    return Response.json({ 
      user: {
        id: user.id,
        full_name: user.full_name,
        display_name: user.display_name,
        email: user.email,
        profile_photo: user.profile_photo,
        profile_picture: user.profile_picture,
        profile_photos: user.profile_photos,
        photos: user.photos,
        photo: user.photo,
        bio: user.bio,
        age: user.age,
        city: user.city,
        occupation: user.occupation,
        languages: user.languages,
        interests: user.interests,
        verified: user.verified,
        user_role: user.user_role,
        average_rating: user.average_rating,
        total_reviews: user.total_reviews,
        gender: user.gender
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return Response.json({ 
      error: `Failed to fetch user profile: ${error.message}` 
    }, { status: 500 });
  }
});