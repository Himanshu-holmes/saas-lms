// app/actions/companions.ts (or your file path)
"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createSupabaseClient } from "@/lib/supabase"; // Adjust path if needed

// --- Define a reusable, generic type for all action results ---
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

// --- Assuming these types are defined elsewhere ---
// type CreateCompanion = { ... };
// type Companion = { id: string; ... };
// type GetAllCompanions = { limit?: number; page?: number; subject?: string; topic?: string; };

// =============================================
// COMPANION C.R.U.D. ACTIONS
// =============================================

export const createCompanion = async (
  formData: CreateCompanion
): Promise<ActionResult<Companion>> => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, message: "Authentication required." };
    }

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("companions")
      .insert({ ...formData, author: userId }) // Best practice: use user_id column
      .select()
      .single(); // .single() returns one object or null, which is cleaner

    if (error) {
      console.error("Supabase Create Error:", error);
      if (error.code === "23505") {
        return {
          success: false,
          message: "A companion with this name already exists.",
        };
      }
      return {
        success: false,
        message: "Database error: Failed to create companion.",
      };
    }

    if (!data) {
      return {
        success: false,
        message: "Failed to create companion, no data returned.",
      };
    }

    revalidatePath("/"); // Revalidate the main page or companion list page
    return { success: true, data };
  } catch (e) {
    console.error("Unexpected CreateCompanion Error:", e);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const getAllCompanions = async ({
  limit = 10,
  page = 1,
  subject,
  topic,
}: GetAllCompanions): Promise<ActionResult<Companion[]>> => {
  try {
    const supabase = createSupabaseClient();
    let query = supabase.from("companions").select("*");

    if (subject && topic) {
      query = query
        .ilike("subject", `%${subject}%`)
        .or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`);
    } else if (subject) {
      query = query.ilike("subject", `%${subject}%`);
    } else if (topic) {
      query = query.or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`);
    }

    query = query.range((page - 1) * limit, page * limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error("Supabase GetAll Error:", error);
      return { success: false, message: "Failed to fetch companions." };
    }

    return { success: true, data: data || [] };
  } catch (e) {
    console.error("Unexpected GetAllCompanions Error:", e);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const getCompanion = async (
  id: string
): Promise<ActionResult<Companion>> => {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("companions")
      .select()
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase GetOne Error:", error);
      // This handles cases where the UUID is invalid, etc.
      return { success: false, message: "Failed to fetch companion data." };
    }

    if (!data) {
      return { success: false, message: "Companion not found." };
    }

    return { success: true, data };
  } catch (e) {
    console.error("Unexpected GetCompanion Error:", e);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const getUserCompanions = async (): Promise<
  ActionResult<Companion[]>
> => {
  try {
    const {userId} = await auth();
    // console.log("userId",userId)
    // console.log("userId", userId);
    if (!userId) {
      return { success: false, message: "Authentication required." };
    }
    // const userId = user.id;

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("companions")
      .select()
      .eq("author", userId); // Assumes column is user_id

    if (error) {
      console.error("Supabase GetUserCompanions Error:", error);
      return { success: false, message: "Failed to fetch your companions." };
    }

    return { success: true, data: data || [] };
  } catch (e) {
    console.error("Unexpected GetUserCompanions Error:", e);
    return { success: false, message: "An unexpected error occurred." };
  }
};

// =============================================
// SESSION & HISTORY ACTIONS
// =============================================

export const getUserSessions = async ( limit = 10):Promise<ActionResult<Companion[]>> => {
   try {
     const {userId} = await auth();
     if (!userId) {
         return { success: false, message: "Authentication required." };
     }
   const supabase = createSupabaseClient();
   const { data, error } = await supabase
     .from("session_history")
     .select(`companions:companion_id (*)`)
     .eq("user_id", userId)
     .order("created_at", { ascending: false })
     .limit(limit);
 
   if (error){
        console.error("Supabase GetUserSessions Error:", error);
        return { success: false, message: "Failed to fetch your session history." };
   }
 
   return {
    success: true,
    data: data.map(({ companions }) => companions)
   }
   } catch (error) {
        console.error("Unexpected GetUserSessions Error:", error);
        return { success: false, message: "An unexpected error occurred." };
   }
};

export const addToSessionHistory = async (
  companionId: string
): Promise<ActionResult<null>> => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        message: "Authentication required to start a session.",
      };
    }

    const supabase = createSupabaseClient();
    const { error } = await supabase.from("session_history").insert({
      companion_id: companionId,
      user_id: userId,
    });

    if (error) {
      console.error("Supabase AddToHistory Error:", error);
      return { success: false, message: "Failed to save session history." };
    }

    return { success: true, data: null };
  } catch (e) {
    console.error("Unexpected AddToSessionHistory Error:", e);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const getRecentSessions = async (
  limit = 10
): Promise<ActionResult<Companion[]>> => {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("session_history")
      .select(`companions:companion_id (*)`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Supabase GetRecentSessions Error:", error);
      return { success: false, message: "Failed to fetch recent sessions." };
    }

    const companions =
      data?.map(({ companions }) => companions).filter(Boolean) || [];
    return { success: true, data: companions };
  } catch (e) {
    console.error("Unexpected GetRecentSessions Error:", e);
    return { success: false, message: "An unexpected error occurred." };
  }
};

// =============================================
// BOOKMARK ACTIONS
// =============================================

export const addBookmark = async (
  companionId: string,
  path: string
): Promise<ActionResult<null>> => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        message: "You must be logged in to add a bookmark.",
      };
    }
    const supabase = createSupabaseClient();
    const { error } = await supabase.from("bookmarks").insert({
      companion_id: companionId,
      user_id: userId,
    });

    if (error) {
      // Handles if the bookmark already exists (unique constraint violation)
      if (error.code === "23505") {
        return {
          success: false,
          message: "This companion is already bookmarked.",
        };
      }
      console.error("Supabase AddBookmark Error:", error);
      return { success: false, message: "Failed to add bookmark." };
    }

    revalidatePath(path);
    return { success: true, data: null };
  } catch (e) {
    console.error("Unexpected AddBookmark Error:", e);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const removeBookmark = async (
  companionId: string,
  path: string
): Promise<ActionResult<null>> => {
  try {
    const {userId} = await auth();
    if (!userId) {
      return {
        success: false,
        message: "You must be logged in to remove a bookmark.",
      };
    }
    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("companion_id", companionId)
      .eq("user_id", userId);

    if (error) {
      console.error("Supabase RemoveBookmark Error:", error);
      return { success: false, message: "Failed to remove bookmark." };
    }

    revalidatePath(path);
    return { success: true, data: null };
  } catch (e) {
    console.error("Unexpected RemoveBookmark Error:", e);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const getBookmarkedCompanions = async (): Promise<
  ActionResult<Companion[]>
> => {
  try {
    const {userId} = await auth();
    if (!userId) {
      return { success: false, message: "Authentication required." };
    }
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("bookmarks")
      .select(`companions:companion_id (*)`)
      .eq("user_id", userId);

    if (error) {
      console.error("Supabase GetBookmarked Error:", error);
      return { success: false, message: "Failed to fetch bookmarks." };
    }

    const companions =
      data?.map(({ companions }) => companions).filter(Boolean) || [];
    return { success: true, data: companions };
  } catch (e) {
    console.error("Unexpected GetBookmarkedCompanions Error:", e);
    return { success: false, message: "An unexpected error occurred." };
  }
};

// =============================================
// PERMISSIONS
// =============================================

export const checkCompanionCreationPermissions = async (): Promise<
  ActionResult<boolean>
> => {
  try {
    const { userId, has } = await auth();
    if (!userId) {
      return { success: false, message: "Authentication required." };
    }

    if (
      has({ permission: "org:feature:unlimited_companions" }) ||
      has({ plan: "pro" })
    ) {
      return { success: true, data: true }; // User has unlimited access
    }

    // Determine the limit based on other features/plans
    let limit = 5; // Default limit
    if (has({ feature: "3_companion_limit" })) limit = 3;
    if (has({ feature: "10_companion_limit" })) limit = 10;

    const supabase = createSupabaseClient();
    const { count, error } = await supabase
      .from("companions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.error("Supabase Count Error:", error);
      return {
        success: false,
        message: "Could not verify your companion limit.",
      };
    }

    return { success: true, data: (count || 0) < limit };
  } catch (e) {
    console.error("Unexpected Permission Check Error:", e);
    return {
      success: false,
      message: "An unexpected error occurred while checking permissions.",
    };
  }
};


export const newCompanionPermissions = async ():Promise<ActionResult<boolean>> => {
  try {
    const { userId, has } = await auth();
    const supabase = createSupabaseClient();
  
    let limit = 0;
  
    if (has({ plan: "pro" })) {
      return { success: true, data: true };
    } else if (has({ feature: "3_companion_limit" })) {
      limit = 3;
    } else if (has({ feature: "10_companion_limit" })) {
      limit = 10;
    }
  
    const { data, error } = await supabase
      .from("companions")
      .select("id", { count: "exact" })
      .eq("author", userId);

    //   console.log("data", data);
    //   console.log("userId", userId);
    //   console.log("limit", limit);
  
    if (error) {
        console.error("Supabase Count Error:", error);
        return {
          success: false,
          message: "Could not verify your companion limit.",
        };
    }
  
    const companionCount = data?.length;
  
    if (companionCount >= limit) {
      return { success: false, message: "Companion limit reached." };
    } else {
      return { success: true, data: true}
    }
  } catch (error) {
    console.error("Unexpected Permission Check Error:", error);
    return {
      success: false,
      message: "An unexpected error occurred while checking permissions.",
    };
  }
};



