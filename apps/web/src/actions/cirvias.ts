"use server";

import { randomUUID } from "crypto";

import { createSupabaseServerClient } from "../lib/supabase/server";
import { requireUser } from "../lib/auth";
import type { CirviaRole } from "../types/cirvia";

async function logAuditAction(action: string, cirviaId: string, targetUserId?: string) {
  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    cirvia_id: cirviaId,
    action,
    target_user_id: targetUserId ?? null,
  });
}

export async function createCirvia(formData: FormData) {
  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "public");

  if (!name) {
    throw new Error("Name is required.");
  }

  const { data, error } = await supabase
    .from("cirvias")
    .insert({
      name,
      description: description || null,
      visibility,
      invite_only: true,
      auto_approve: false,
      owner_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("cirvia_members").insert({
    cirvia_id: data.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  await logAuditAction("cirvia.created", data.id, user.id);

  return data.id as string;
}

export async function updateCirviaSettings(cirviaId: string, formData: FormData) {
  await requireUser();
  const supabase = createSupabaseServerClient();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "public");
  const inviteOnly = formData.get("invite_only") === "on";
  const autoApprove = formData.get("auto_approve") === "on";

  const { error } = await supabase
    .from("cirvias")
    .update({
      name,
      description: description || null,
      visibility,
      invite_only: inviteOnly,
      auto_approve: autoApprove,
    })
    .eq("id", cirviaId);

  if (error) {
    throw new Error(error.message);
  }

  await logAuditAction("cirvia.settings.updated", cirviaId);
}

export async function createInviteLink(cirviaId: string) {
  const user = await requireUser();
  const supabase = createSupabaseServerClient();
  const token = randomUUID();

  const { error } = await supabase.from("cirvia_invites").insert({
    cirvia_id: cirviaId,
    token,
    created_by: user.id,
    single_use: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  await logAuditAction("cirvia.invite.created", cirviaId);

  return token;
}

export async function requestToJoin(cirviaId: string) {
  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const { data: cirvia, error: cirviaError } = await supabase
    .from("cirvias")
    .select("visibility")
    .eq("id", cirviaId)
    .single();

  if (cirviaError || !cirvia) {
    throw new Error("Cirvia not found.");
  }

  if (cirvia.visibility === "private") {
    throw new Error("This Cirvia requires an invite.");
  }

  const { data: existing } = await supabase
    .from("cirvia_members")
    .select("status")
    .eq("cirvia_id", cirviaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.status === "banned") {
    throw new Error("You are banned from this Cirvia.");
  }

  if (existing) {
    throw new Error("You have already requested to join.");
  }

  const { error } = await supabase.from("cirvia_members").insert({
    cirvia_id: cirviaId,
    user_id: user.id,
    role: "member",
    status: "pending",
  });

  if (error) {
    throw new Error(error.message);
  }

  await logAuditAction("cirvia.join.requested", cirviaId, user.id);
}

export async function acceptInvite(token: string) {
  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const { data: invite, error: inviteError } = await supabase
    .from("cirvia_invites")
    .select("id, cirvia_id, single_use, used_at")
    .eq("token", token)
    .single();

  if (inviteError || !invite) {
    throw new Error("Invite not found.");
  }

  if (invite.single_use && invite.used_at) {
    throw new Error("Invite already used.");
  }

  const { data: existing } = await supabase
    .from("cirvia_members")
    .select("status")
    .eq("cirvia_id", invite.cirvia_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.status === "banned") {
    throw new Error("You are banned from this Cirvia.");
  }

  if (existing) {
    throw new Error("You already have a membership record for this Cirvia.");
  }

  const { data: cirvia, error: cirviaError } = await supabase
    .from("cirvias")
    .select("auto_approve")
    .eq("id", invite.cirvia_id)
    .single();

  if (cirviaError || !cirvia) {
    throw new Error("Cirvia not found.");
  }

  const status = cirvia.auto_approve ? "active" : "pending";

  const { error: membershipError } = await supabase.from("cirvia_members").insert({
    cirvia_id: invite.cirvia_id,
    user_id: user.id,
    role: "member",
    status,
  });

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  await logAuditAction("cirvia.invite.accepted", invite.cirvia_id, user.id);

  if (invite.single_use) {
    await supabase
      .from("cirvia_invites")
      .update({ used_by: user.id, used_at: new Date().toISOString() })
      .eq("id", invite.id);
  }
}

export async function approveJoinRequest(memberId: string) {
  await requireUser();
  const supabase = createSupabaseServerClient();

  const { data: member, error } = await supabase
    .from("cirvia_members")
    .update({ status: "active" })
    .eq("id", memberId)
    .select("cirvia_id, user_id")
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  if (member?.length) {
    await logAuditAction("cirvia.join.approved", member[0].cirvia_id, member[0].user_id);
  }
}

export async function denyJoinRequest(memberId: string) {
  await requireUser();
  const supabase = createSupabaseServerClient();

  const { data: member, error } = await supabase
    .from("cirvia_members")
    .update({ status: "invited" })
    .eq("id", memberId)
    .select("cirvia_id, user_id")
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  if (member?.length) {
    await logAuditAction("cirvia.join.denied", member[0].cirvia_id, member[0].user_id);
  }
}

export async function changeMemberRole(memberId: string, role: CirviaRole) {
  await requireUser();
  const supabase = createSupabaseServerClient();

  const { data: member, error } = await supabase
    .from("cirvia_members")
    .update({ role })
    .eq("id", memberId);

  if (error) {
    throw new Error(error.message);
  }

  if (member?.length) {
    await logAuditAction("cirvia.member.role.updated", member[0].cirvia_id, member[0].user_id);
  }
}

export async function removeMember(memberId: string) {
  await requireUser();
  const supabase = createSupabaseServerClient();

  const { data: member, error } = await supabase
    .from("cirvia_members")
    .delete()
    .eq("id", memberId)
    .select("cirvia_id, user_id");

  if (error) {
    throw new Error(error.message);
  }

  if (member?.length) {
    await logAuditAction("cirvia.member.removed", member[0].cirvia_id, member[0].user_id);
  }
}

export async function banMember(memberId: string) {
  await requireUser();
  const supabase = createSupabaseServerClient();

  const { data: member, error } = await supabase
    .from("cirvia_members")
    .update({ status: "banned" })
    .eq("id", memberId)
    .select("cirvia_id, user_id");

  if (error) {
    throw new Error(error.message);
  }

  if (member?.length) {
    await logAuditAction("cirvia.member.banned", member[0].cirvia_id, member[0].user_id);
  }
}

export async function listMyCirvias() {
  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("cirvia_members")
    .select("cirvia_id, cirvias ( id, name, description, visibility )")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listPendingMembers(cirviaId: string) {
  await requireUser();
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("cirvia_members")
    .select("id, user_id, role, status, created_at")
    .eq("cirvia_id", cirviaId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function discoverPublicCirvias() {
  await requireUser();
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("cirvias")
    .select("id, name, description, visibility")
    .eq("visibility", "public");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
