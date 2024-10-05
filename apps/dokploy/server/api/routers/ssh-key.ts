import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import {
	apiCreateSshKey,
	apiFindOneSshKey,
	apiGenerateSSHKey,
	apiRemoveSshKey,
	apiUpdateSshKey,
	sshKeys,
} from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import {
	generateSSHKey,
	createSshKey,
	findSSHKeyById,
	removeSSHKeyById,
	updateSSHKeyById,
	IS_CLOUD,
} from "@dokploy/builders";
import { eq } from "drizzle-orm";

export const sshRouter = createTRPCRouter({
	create: protectedProcedure
		.input(apiCreateSshKey)
		.mutation(async ({ input, ctx }) => {
			try {
				await createSshKey({
					...input,
					adminId: ctx.user.adminId,
				});
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Error to create the ssh key",
					cause: error,
				});
			}
		}),
	remove: protectedProcedure
		.input(apiRemoveSshKey)
		.mutation(async ({ input, ctx }) => {
			try {
				const sshKey = await findSSHKeyById(input.sshKeyId);
				if (IS_CLOUD && sshKey.adminId !== ctx.user.adminId) {
					// TODO: Remove isCloud in the next versions of dokploy
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You are not allowed to delete this ssh key",
					});
				}

				return await removeSSHKeyById(input.sshKeyId);
			} catch (error) {
				throw error;
			}
		}),
	one: protectedProcedure
		.input(apiFindOneSshKey)
		.query(async ({ input, ctx }) => {
			const sshKey = await findSSHKeyById(input.sshKeyId);

			if (IS_CLOUD && sshKey.adminId !== ctx.user.adminId) {
				// TODO: Remove isCloud in the next versions of dokploy
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You are not allowed to access this ssh key",
				});
			}
			return sshKey;
		}),
	all: protectedProcedure.query(async ({ ctx }) => {
		return await db.query.sshKeys.findMany({
			...(IS_CLOUD && { where: eq(sshKeys.adminId, ctx.user.adminId) }),
		});
		// TODO: Remove this line when the cloud version is ready
	}),
	generate: protectedProcedure
		.input(apiGenerateSSHKey)
		.mutation(async ({ input }) => {
			return await generateSSHKey(input.type);
		}),
	update: protectedProcedure
		.input(apiUpdateSshKey)
		.mutation(async ({ input, ctx }) => {
			try {
				const sshKey = await findSSHKeyById(input.sshKeyId);
				if (IS_CLOUD && sshKey.adminId !== ctx.user.adminId) {
					// TODO: Remove isCloud in the next versions of dokploy
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You are not allowed to update this ssh key",
					});
				}
				return await updateSSHKeyById(input);
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Error to update this ssh key",
					cause: error,
				});
			}
		}),
});
