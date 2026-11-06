import { signRequest } from "@worldcoin/idkit-core/signing";
import { hashSignal } from "@worldcoin/idkit-core/hashing";
import mongoose from "mongoose";
import { z } from "zod";
import type { Config } from "./config";
import { Challenge, Student, Verification } from "./models";
import { HttpError, commitment, randomToken, requireValue } from "./security";
import { requireWorldPrerequisites } from './learningAccess';
import { worldDiagnostic,worldScope } from './worldDiagnostics';
export const WORLD_PROOF_CONTRACT_VERSION='orb-compat-v2';
export function worldConfigured(c: Config) {
  return Boolean(
    c.WORLD_ID_APP_ID &&
    c.WORLD_ID_RP_ID &&
    c.WORLD_ID_ACTION &&
    c.WORLD_ID_SIGNING_KEY &&
    c.IDENTITY_SECRET.length >= 32,
  );
}
export async function worldRequest(student: string, c: Config, authSession?:string) {
  if (!worldConfigured(c))
    throw new HttpError(
      503,
      "BLOCKED — EXTERNAL CONFIGURATION REQUIRED: World ID.",
      "world_unconfigured",
    );
  await requireWorldPrerequisites(student);
  if(await Verification.exists({scope:{$ne:worldScope(c)}}))throw new HttpError(409,'Stored human bindings use a different World ID action, RP, or environment. The operator must restore the original settings or perform a reviewed migration before new verification.','world_scope_changed');
  const binding=await Verification.findOne({student});
  if(binding&&binding.scope!==worldScope(c))throw new HttpError(409,'This account was verified under an earlier World ID configuration. Restore that configuration or perform a reviewed migration; do not create a new reward identity.','world_scope_changed');
  worldDiagnostic(c,'request_started');
  const signed = signRequest({
    signingKeyHex: c.WORLD_ID_SIGNING_KEY,
    action: c.WORLD_ID_ACTION,
    ttl: 300,
  });
  const signal = `ethereum-explorer:${student}:${randomToken()}`;
  const record = await Challenge.create({
    student,
    kind: "world",
    nonce: signed.nonce,
    signal,
    authSession,
    worldScope:worldScope(c),
    expiresAt: new Date(signed.expiresAt * 1000),
  });
  worldDiagnostic(c,'signature_created');
  return {
    id: String(record._id),
    signal,
    appId: c.WORLD_ID_APP_ID,
    action: c.WORLD_ID_ACTION,
    environment: c.WORLD_ID_ENVIRONMENT,
    credentialMode: c.WORLD_ID_CREDENTIAL_MODE,
    rpContext: {
      rp_id: c.WORLD_ID_RP_ID,
      nonce: signed.nonce,
      created_at: signed.createdAt,
      expires_at: signed.expiresAt,
      signature: signed.sig,
    },
  };
}
const proofSchema = z
  .object({
    protocol_version: z.literal("4.0"),
    nonce: z.string(),
    action: z.string(),
    environment: z.enum(["production", "staging"]),
    responses: z
      .array(
        z
          .object({
            identifier: z.literal("proof_of_human"),
            issuer_schema_id: z.literal(1),
            signal_hash: z.string(),
            nullifier: z.string(),
          })
          .passthrough(),
      )
      .length(1),
  })
  .passthrough();
// Keep the two identity domains exclusive. Never treat a v3 and v4 nullifier
// as interchangeable or accept weaker legacy credential identifiers.
const legacyOrbSchema=z.object({
  protocol_version:z.literal('3.0'),nonce:z.string(),action:z.string(),
  environment:z.enum(['production','staging']),
  responses:z.array(z.object({
    identifier:z.literal('orb'),signal_hash:z.string(),nullifier:z.string(),
    // The installed IDKit parser preserves legacy fields as strings and does not
    // require fixed-width zero padding. Validate encodings and bounds instead.
    merkle_root:z.string().regex(/^0x[0-9a-fA-F]{1,64}$/),
    proof:z.string().regex(/^0x(?:[0-9a-fA-F]{2}){1,4096}$/),
  }).passthrough()).length(1),
}).passthrough();
const knownCredentials=new Set(['orb','proof_of_human','passport','mnc','selfie','device','document','secure_document']);
function safeProofShape(value:unknown){
  if(!value||typeof value!=='object')return {protocol:'unknown',credential:'unknown',responseCount:0};
  const proof=value as {protocol_version?:unknown;responses?:unknown};
  const protocol=proof.protocol_version==='3.0'||proof.protocol_version==='4.0'?proof.protocol_version:'unknown';
  const responses=Array.isArray(proof.responses)?proof.responses:[];
  const first=responses[0]&&typeof responses[0]==='object'?responses[0] as {identifier?:unknown}:undefined;
  const credential=typeof first?.identifier==='string'&&knownCredentials.has(first.identifier)?first.identifier:'unknown';
  return {protocol,credential,responseCount:responses.length};
}
export function canonicalField(value: string) {
  if (!/^(0x[0-9a-fA-F]+|[0-9]+)$/.test(value) || value.length > 80)
    throw new HttpError(400, "Invalid World ID field.");
  const number=BigInt(value);
  if(number>=(1n<<256n))throw new HttpError(400,'World ID field exceeds 256 bits.','world_invalid_field');
  return number.toString(10);
}
// Verify the full IDKit result. Accept only Orb / Proof of Human, never device or document credentials.
export async function verifyWorld(
  student: string,
  id: string,
  raw: unknown,
  c: Config,
  fetcher: typeof fetch = fetch,
  options:{authSession?:string;onBound?:(targetStudent:string,session:mongoose.ClientSession)=>Promise<void>}={},
) {
  if (!worldConfigured(c))
    throw new HttpError(503, "World ID is not configured.");
  const pending = requireValue(
    await Challenge.findOne({
      _id: id,
      student,
      kind: "world",
      used: false,
      expiresAt: { $gt: new Date() },
    }),
    "Verification request expired.",
    400,
  );
  if(pending.authSession!==options.authSession)throw new HttpError(400,'Start verification again from your current signed-in session.','world_session_mismatch');
  if(pending.worldScope!==worldScope(c))throw new HttpError(400,'World ID configuration changed after this request. Start a fresh verification.','world_configuration_changed');
  await requireWorldPrerequisites(student);
  worldDiagnostic(c,'proof_received');
  const legacy=c.WORLD_ID_CREDENTIAL_MODE==='orb-legacy';
  const parsed = (legacy?legacyOrbSchema:proofSchema).safeParse(raw);
  if (!parsed.success)
    throw new HttpError(
      400,
      legacy?`This server expects an Orb v3 proof, but IDKit returned protocol ${safeProofShape(raw).protocol} credential ${safeProofShape(raw).credential}. Check the active backend and credential selected in World App.`:`This server expects a v4 Proof of Human result, but IDKit returned protocol ${safeProofShape(raw).protocol} credential ${safeProofShape(raw).credential}. Check the active backend and credential selected in World App.`,
      legacy?'world_invalid_orb_proof':"world_unsupported_proof",
    );
  const proof = parsed.data;
  const response = proof.responses[0];
  const expectedHash = hashSignal(String(pending.signal));
  if(proof.action!==c.WORLD_ID_ACTION)throw new HttpError(400,'The proof action does not match the action signed by this backend.','world_action_mismatch');
  if(proof.environment!==c.WORLD_ID_ENVIRONMENT)throw new HttpError(400,'The proof environment does not match this server. Simulator and production proofs cannot be mixed.','world_environment_mismatch');
  if(proof.nonce!==pending.nonce)throw new HttpError(400,'The proof nonce does not match this signed request. Start a fresh World ID request.','world_nonce_mismatch');
  if(canonicalField(response.signal_hash)!==canonicalField(expectedHash))
    throw new HttpError(
      400,
      "The proof signal does not match this account and request. Start a fresh World ID request.",
      'world_signal_mismatch',
    );
  worldDiagnostic(c,'provider_verification_started');
  let result: Response;
  try {
    result = await fetcher(
      `https://developer.world.org/api/v4/verify/${encodeURIComponent(c.WORLD_ID_RP_ID)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(raw),
        signal: AbortSignal.timeout(15000),
      },
    );
  } catch {
    throw new HttpError(
      503,
      "The backend could not reach the World ID verifier. Start a fresh verification and try again.",
      "world_verifier_unreachable",
    );
  }
  if(result.status===429)throw new HttpError(429,'World ID verification is temporarily rate limited. Wait before starting a fresh request.','world_verifier_rate_limited');
  if(result.status>=500)throw new HttpError(503,'World ID verification is temporarily unavailable. Please try again.','world_verifier_unavailable');
  const providerSchema = z.object({
    success: z.boolean().optional(),
    action: z.string().optional(),
    environment: z.string().optional(),
    nullifier: z.string().optional(),
    code: z.string().optional(),
    results: z
      .array(
        z.object({
          success: z.boolean(),
          identifier: z.string().optional(),
          nullifier: z.string().optional(),
          code: z.string().optional(),
        }),
      )
      .optional(),
  });
  const provider = providerSchema.safeParse(
    await result.json().catch(() => null),
  );
  if (!provider.success)
    throw new HttpError(
      502,
      "The World ID verifier returned an unreadable response. Please try again.",
      "world_verifier_response",
    );
  const body = provider.data;
  if (
    !result.ok ||
    body.success !== true ||
    body.results?.length !== 1 ||
    body.results[0].success !== true
  ) {
    const providerCode =
      body.code || body.results?.find((r) => !r.success)?.code || "";
    const reasons: Record<string, string> = {
      invalid_proof: "World ID rejected the cryptographic proof.",
      invalid_rp_signature:
        "World ID rejected the RP signature. Check that the RP ID and signing key belong together.",
      unknown_rp: "World ID does not recognize this RP registration.",
      inactive_rp: "The RP registration is inactive.",
      invalid_action: "The action is not registered for this application.",
      invalid_merkle_root: "World ID could not find the credential root.",
      root_too_old: "The credential proof is too old. Start again.",
      already_verified:
        "World ID reports that this action was already verified. Sign in to your original account or use its recovery code. An error response alone cannot authorize an account switch.",
      max_verifications_reached:
        "The World ID action has reached its verification limit. Sign in to your original account or use account recovery; a fresh accepted proof is required for World ID account switching.",
    };
    const known = Object.hasOwn(reasons, providerCode);
    throw new HttpError(
      result.status === 429 ? 429 : 400,
      `${known ? reasons[providerCode] : "World ID rejected this proof."} [${known ? providerCode : "world_proof_rejected"}] Your reward attempt has not been consumed.`,
      known ? `world_${providerCode}` : "world_proof_rejected",
    );
  }
  if (
    body.action !== c.WORLD_ID_ACTION ||
    body.environment !== c.WORLD_ID_ENVIRONMENT ||
    body.results[0].identifier !== (legacy?'orb':'proof_of_human')
  )
    throw new HttpError(
      400,
      "The verified result does not match the configured action, environment, or required human credential.",
      "world_result_mismatch",
    );
  const nullifier = body.nullifier || body.results[0].nullifier;
  if (
    !nullifier ||
    canonicalField(nullifier) !== canonicalField(response.nullifier)
  )
    throw new HttpError(
      400,
      "World ID did not return a supported uniqueness identifier.",
      "world_nullifier_mismatch",
    );
  const scope = worldScope(c);
  const human = commitment(c.IDENTITY_SECRET, scope, canonicalField(nullifier));
  let targetStudent=student;
  let existingAccount=false;
  const bind=()=>mongoose.connection.transaction(async (session) => {
    const owner=await Verification.findOne({human,scope}).session(session);
    const current=await Verification.findOne({student}).session(session);
    if(!owner&&current)throw new HttpError(409,'This account is already bound to a different verified identity. Sign in to the intended account.','world_account_conflict');
    targetStudent=owner?String(owner.student):student;
    existingAccount=Boolean(owner);
    if(!await Student.exists({_id:targetStudent}).session(session))throw new HttpError(409,'The verified account is unavailable. Use account recovery or contact support.','world_account_unavailable');
    const consumed = await Challenge.updateOne(
      { _id: id, student, used: false, expiresAt: { $gt: new Date() } },
      { $set: { used: true } },
      { session },
    );
    if (consumed.modifiedCount !== 1)
      throw new HttpError(
        409,
        "This verification request has already been used.",
      );
    if(!owner)await Verification.create(
      [
        {
          student,
          human,
          scope,
          environment: c.WORLD_ID_ENVIRONMENT,
          verifiedAt: new Date(),
        },
      ],
      { session },
    );
    // Session replacement and nonce consumption commit together. Nothing is merged
    // from the secondary account: wallets, progress and rewards keep their owners.
    if(options.onBound)await options.onBound(targetStudent,session);
  });
  try{await bind();}catch(error){
    // Another fresh request may have bound this same human concurrently.
    // Retry the transaction against the winning account, never create a duplicate.
    if((error as {code?:number}).code===11000)await bind();else throw error;
  }
  worldDiagnostic(c,existingAccount?'existing_account_resolved':'account_bound');
  return { verified: true, environment: c.WORLD_ID_ENVIRONMENT,targetStudent,existingAccount,accountSwitched:targetStudent!==student };
}
