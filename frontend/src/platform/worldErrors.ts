const messages:Record<string,string>={
  invalid_rp_signature:'World App rejected the request signature. The RP ID and signing key must belong to the same active registration in the World Developer Portal.',
  unknown_rp:'World App does not recognize this RP ID. Check the RP registration and selected environment.',
  inactive_rp:'This World ID relying-party registration is inactive. Activate it in the World Developer Portal.',
  invalid_rp_id_format:'The configured World ID RP ID has an invalid format.',
  credential_unavailable:'This World ID does not have the Proof of Human credential required by this lesson platform.',
  world_id_4_not_available:'World ID 4 is not available for this account or World App installation. This platform currently requires a World ID 4 Proof of Human credential.',
  verification_rejected:'World App rejected the verification. Check the requested credential and registration in World App.',
  feature_unavailable:'The requested verification feature is unavailable in this World App installation.',
  rp_signature_expired:'The verification request expired. Close the dialog and start a new verification.',
  timestamp_too_old:'The request timestamp is too old. Start again; if it repeats, check the backend computer clock.',
  timestamp_too_far_in_future:'The backend clock is ahead of World ID. Synchronize the computer clock, then restart verification.',
  duplicate_nonce:'This request has already been used. Close the dialog and start a new verification.',
  nullifier_replayed:'World ID reports that this verification has already been used for the action.',
  max_verifications_reached:'This action has reached its verification limit. Check its configuration in the World Developer Portal.',
  connection_failed:'The browser could not communicate with the World ID service. Check the connection and try a fresh request.',
  inclusion_proof_pending:'World ID is still preparing your credential. Wait and try again.',
  inclusion_proof_failed:'World App could not obtain the credential inclusion proof. Try again in World App.',
  timeout:'World ID verification timed out. Close the dialog and start again.',
  cancelled:'Verification was cancelled.',
  user_rejected:'Verification was declined in World App.',
  malformed_request:'World App could not read the request. Check that the app, action, RP ID, and environment belong together.',
  invalid_network:'World App rejected the selected verification network or environment.',
  failed_by_host_app:'World App returned a result, but the website could not accept it. Check the backend verification error.',
};
export function worldErrorMessage(code:string,backendError?:string){
  if(code==='failed_by_host_app'&&backendError)return backendError;
  const safeCode=/^[a-z0-9_]{1,64}$/.test(code)?code:'unknown_error';
  return `${Object.hasOwn(messages,safeCode)?messages[safeCode]:'World ID could not complete verification. Report this error code so we can trace the failure.'} [${safeCode}] Your reward attempt has not been consumed.`;
}
