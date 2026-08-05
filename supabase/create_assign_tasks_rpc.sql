-- Function to assign tasks to a child via RPC
-- Handles batch inserting tasks and skipping already assigned ones
-- Returns a JSON object with counts for { assigned, skipped }
CREATE OR REPLACE FUNCTION assign_tasks_to_child(
  p_task_ids uuid[],
  p_child_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_assigned integer := 0;
  v_skipped integer := 0;
  v_total_input integer;
BEGIN
  v_total_input := COALESCE(array_length(p_task_ids, 1), 0);
  
  IF v_total_input > 0 THEN
    WITH inserted AS (
      INSERT INTO task_progress (child_id, task_id)
      SELECT p_child_id, unnest(p_task_ids)
      ON CONFLICT (child_id, task_id) DO NOTHING
      RETURNING id
    )
    SELECT count(*) INTO v_assigned FROM inserted;
    
    v_skipped := v_total_input - v_assigned;
  END IF;

  RETURN jsonb_build_object(
    'assigned', v_assigned,
    'skipped', v_skipped
  );
END;
$$ LANGUAGE plpgsql;
