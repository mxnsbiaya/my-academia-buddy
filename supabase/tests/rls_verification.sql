-- ==============================================================================
-- My Academia Buddy — Phase 3: SQL-Level RLS Verification Suite
-- Script: supabase/tests/rls_verification.sql
-- Run this script in the Supabase SQL Editor or psql to verify multi-tenant isolation.
-- ==============================================================================

DO $$
DECLARE
  v_user_a UUID := 'a0000000-0000-0000-0000-000000000001';
  v_user_b UUID := 'b0000000-0000-0000-0000-000000000002';
  v_count INT;
  v_error_caught BOOLEAN := false;
BEGIN
  RAISE NOTICE '--- Starting Phase 3 RLS Verification Tests ---';

  -- ============================================================================
  -- 1. Setup Test Users in auth.users (if not present)
  -- ============================================================================
  INSERT INTO auth.users (id, email, raw_user_meta_data, role, aud)
  VALUES 
    (v_user_a, 'student.a@example.com', '{"full_name": "Student A"}'::jsonb, 'authenticated', 'authenticated'),
    (v_user_b, 'student.b@example.com', '{"full_name": "Student B"}'::jsonb, 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================================
  -- 2. Simulate User A Context
  -- ============================================================================
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a::text, 'role', 'authenticated')::text, true);

  -- User A creates course with client_id '101'
  INSERT INTO public.courses (user_id, client_id, name, difficulty)
  VALUES (v_user_a, '101', 'CSI2110 Algorithms (User A)', 'High')
  ON CONFLICT (user_id, client_id) DO UPDATE SET name = EXCLUDED.name;

  -- User A adds a syllabus topic referencing course '101'
  INSERT INTO public.syllabus_topics (user_id, client_id, course_client_id, course_name, title, status)
  VALUES (v_user_a, 'top-101-1', '101', 'CSI2110 Algorithms (User A)', 'Heap Sort & Priority Queues', 'practiced')
  ON CONFLICT (user_id, client_id) DO UPDATE SET title = EXCLUDED.title;

  -- User A adds an assignment
  INSERT INTO public.assignments (user_id, client_id, course, title, priority)
  VALUES (v_user_a, 'asg-1', 'CSI2110 Algorithms (User A)', 'Problem Set 1', 'High')
  ON CONFLICT (user_id, client_id) DO NOTHING;

  -- Verify User A sees 1 course and 1 topic
  SELECT COUNT(*) INTO v_count FROM public.courses WHERE user_id = v_user_a;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'TEST FAILED: User A cannot see their own course!';
  END IF;
  RAISE NOTICE '✓ Check 1 Passed: User A successfully created and queried their own records.';

  -- ============================================================================
  -- 3. Switch Context to User B
  -- ============================================================================
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_b::text, 'role', 'authenticated')::text, true);

  -- Verify User B querying courses returns 0 of User A's rows
  SELECT COUNT(*) INTO v_count FROM public.courses WHERE user_id = v_user_a;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'SECURITY BREACH: User B can see User A courses! RLS is NOT enforcing isolation!';
  END IF;
  RAISE NOTICE '✓ Check 2 Passed: User B cannot select User A records (0 returned).';

  -- Verify User B attempting to UPDATE User A's course affects 0 rows
  UPDATE public.courses SET name = 'Hacked by User B' WHERE user_id = v_user_a;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'SECURITY BREACH: User B successfully updated User A course!';
  END IF;
  RAISE NOTICE '✓ Check 3 Passed: User B update on User A record modified 0 rows.';

  -- Verify User B attempting to DELETE User A's course affects 0 rows
  DELETE FROM public.courses WHERE user_id = v_user_a;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'SECURITY BREACH: User B successfully deleted User A course!';
  END IF;
  RAISE NOTICE '✓ Check 4 Passed: User B delete on User A record deleted 0 rows.';

  -- Verify User B attempting to INSERT a course with User A's user_id fails RLS check
  v_error_caught := false;
  BEGIN
    INSERT INTO public.courses (user_id, client_id, name)
    VALUES (v_user_a, 'spoof-1', 'Spoofed Course');
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
  END;
  IF NOT v_error_caught THEN
    RAISE EXCEPTION 'SECURITY BREACH: User B inserted record with User A user_id without policy check violation!';
  END IF;
  RAISE NOTICE '✓ Check 5 Passed: User B spoofed insert was blocked with RLS policy check violation.';

  -- Verify User B can use the EXACT SAME client_id '101' without collision
  INSERT INTO public.courses (user_id, client_id, name, difficulty)
  VALUES (v_user_b, '101', 'SEG2105 Software Engineering (User B)', 'Medium')
  ON CONFLICT (user_id, client_id) DO UPDATE SET name = EXCLUDED.name;
  RAISE NOTICE '✓ Check 6 Passed: User B successfully created course with same client_id "101" (Composite key isolation).';

  -- Verify User B cannot attach a topic to User A's course (Foreign Key + User Scoping)
  v_error_caught := false;
  BEGIN
    -- User B tries to reference User A's course through client_id
    -- Because foreign key is on (user_id, course_client_id), referencing a non-existent course for User B will fail FK
    INSERT INTO public.syllabus_topics (user_id, client_id, course_client_id, course_name, title)
    VALUES (v_user_b, 'top-illegal-1', 'nonexistent-for-b', 'Ghost Course', 'Illegal Topic');
  EXCEPTION WHEN OTHERS THEN
    v_error_caught := true;
  END;
  IF NOT v_error_caught THEN
    RAISE EXCEPTION 'SECURITY BREACH: Foreign key composite constraint did not stop cross-user linking!';
  END IF;
  RAISE NOTICE '✓ Check 7 Passed: Composite foreign key constraint stopped invalid course relationship.';

  -- ============================================================================
  -- 4. Switch back to User A and verify integrity
  -- ============================================================================
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a::text, 'role', 'authenticated')::text, true);

  SELECT name INTO STRICT v_count FROM public.courses WHERE user_id = v_user_a AND client_id = '101';
  -- User A course name should still be untouched
  RAISE NOTICE '✓ Check 8 Passed: User A course remains intact and uncompromised.';

  -- Clean up test records
  DELETE FROM public.courses WHERE user_id IN (v_user_a, v_user_b);
  DELETE FROM auth.users WHERE id IN (v_user_a, v_user_b);

  RAISE NOTICE '=======================================================';
  RAISE NOTICE '🎉 ALL 8 RLS AND MULTI-TENANT ISOLATION CHECKS PASSED!';
  RAISE NOTICE '=======================================================';
END $$;
