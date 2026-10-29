// A finished ElevenLabs intake conversation in their wire format (snake_case,
// as the post_call_transcription webhook and GET /conversations/:id send it).
// Seven CV tool calls, one malformed call, one system tool, and fields we
// don't read, so the parser is tested against what really arrives.

const call = (tool_name: string, params: unknown, i: number) => ({
  type: "client",
  request_id: `req_${i}`,
  tool_name,
  params_as_json: typeof params === "string" ? params : JSON.stringify(params),
  tool_has_been_called: true,
  tool_details: null,
});

export function intakeConversation(opts: { conversationId: string; sessionId: string; attempt?: number; durationSec?: number; status?: string }) {
  return {
    agent_id: "agent_test",
    conversation_id: opts.conversationId,
    status: opts.status ?? "done",
    user_id: null,
    transcript: [
      { role: "agent", message: "Hi, I'm Hired. What's your name, and what do you do right now?", time_in_call_secs: 0, tool_calls: [], tool_results: [] },
      { role: "user", message: "I'm Dana Levi, product manager at Acme in Tel Aviv.", time_in_call_secs: 6 },
      {
        role: "agent",
        message: "Nice, that's on there.",
        time_in_call_secs: 9,
        tool_calls: [
          call("update_personal_info", { name: "Dana Levi", title: "Product Manager", location: "Tel Aviv, Israel" }, 0),
          call("add_experience", { company: "Acme", role: "Product Manager", startDate: "2022", current: true, description: [] }, 1),
        ],
        llm_usage: { model_usage: {} },
      },
      { role: "user", message: "I led checkout. Conversion went up 18 percent.", time_in_call_secs: 20 },
      {
        role: "agent",
        message: "Love that.",
        time_in_call_secs: 24,
        tool_calls: [call("update_experience", { index: 0, description: ["Led the checkout redesign, lifting conversion 18%"] }, 2)],
      },
      {
        role: "agent",
        message: null,
        time_in_call_secs: 30,
        // The model emitted broken JSON once: it still takes a number.
        tool_calls: [call("set_skills", "{not json", 3)],
      },
      { role: "user", message: "BSc in computer science, Technion, 2018. Skills: SQL, Figma, A/B testing.", time_in_call_secs: 40 },
      {
        role: "agent",
        message: "Got it.",
        time_in_call_secs: 45,
        tool_calls: [
          call("add_education", { institution: "Technion", degree: "BSc", field: "Computer Science", endDate: "2018" }, 4),
          call("set_skills", { skills: ["SQL", "Figma", "A/B testing"] }, 5),
          { type: "system", request_id: "sys_1", tool_name: "end_call", params_as_json: "{}", tool_has_been_called: false },
        ],
      },
      {
        role: "agent",
        message: "That's a strong draft.",
        time_in_call_secs: 60,
        tool_calls: [call("update_summary", { summary: "Product manager who led Acme's checkout redesign, lifting conversion 18%." }, 6)],
      },
    ],
    metadata: { start_time_unix_secs: 1_793_000_000, call_duration_secs: opts.durationSec ?? 65, cost: 120, termination_reason: "client disconnected" },
    analysis: { call_successful: "success", transcript_summary: "Intake." },
    conversation_initiation_client_data: {
      conversation_config_override: {},
      dynamic_variables: { voice_session_id: opts.sessionId, voice_attempt: String(opts.attempt ?? 0), cv_snapshot: "…", minutes: "5", opening: "Hi" },
    },
  };
}
