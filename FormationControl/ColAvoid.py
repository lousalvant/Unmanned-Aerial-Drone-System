import numpy as np

def wrap_to_180(angle):
    """
    Wrap angle to [-180, 180] degrees.
    """
    return ((angle + 180) % 360) - 180

def col_avoid(dq, q, dcoll, rcoll):
    """
    Distributed collision avoidance by rotating the control vectors.

    Parameters:
    - q (numpy.ndarray): Aggregate coordinate vector (2n,)
    - dq (numpy.ndarray): Control direction vector (2n,)
    - dcoll (float): Collision avoidance activation distance
    - rcoll (float): Collision avoidance circle radius

    Returns:
    - u (numpy.ndarray): Modified control vector (2n,)
    - n (int): Number of agents
    - colIdx (numpy.ndarray): Collision avoidance index matrix (n, n)
    - Dc (numpy.ndarray): Matrix of inter-agent distances (n, n)
    """

    # Number of agents
    n = len(q) // 2

    # Coordinates in matrix form (2 x n)
    qm = np.asarray(q).reshape((2, n), order='F').astype(float)

    # Control in matrix form (2 x n)
    ctrl = np.asarray(dq).reshape((2, n), order='F').astype(float)

    # Initialize inter-agent distance matrix
    Dc = np.zeros((n, n))

    # Compute pairwise distances
    for i in range(n):
        for j in range(i + 1, n):
            Dc[i, j] = np.linalg.norm(qm[:, i] - qm[:, j])

    # Make the distance matrix symmetric
    Dc += Dc.T

    # Collision avoidance indices (boolean matrix)
    colIdx = Dc < dcoll

    # Remove self-collision by setting diagonal to False
    np.fill_diagonal(colIdx, False)

    # Initialize stop flag array
    stopFlag = np.zeros(n, dtype=bool)

    for i in range(n):  # Iterate over each agent
        cone_ang = []  # List to store collision cone angles as [thtm, thtp]

        # Find collision cones based on neighbors
        for k in range(n):
            if colIdx[i, k]:
                dnb = Dc[i, k]  # Distance to neighbor
                vec = qm[:, k] - qm[:, i]  # Vector from agent i to neighbor k
                tht = np.degrees(np.arctan2(vec[1], vec[0]))  # Angle of connecting vector

                # 'alp' is the vertex half-angle of the collision cone
                if dnb <= dcoll:
                    alp = 90.0
                else:
                    # Prevent domain error in arcsin
                    ratio = rcoll / dnb
                    ratio = np.clip(ratio, -1.0, 1.0)
                    alp = np.abs(np.degrees(np.arcsin(ratio)))

                # Angles of the cone sides
                thtm = tht - alp
                thtp = tht + alp

                # Wrap angles to [-180, 180]
                thtm_wrapped = wrap_to_180(thtm)
                thtp_wrapped = wrap_to_180(thtp)

                # Handle angle wrapping across -180 or 180 degrees
                if thtm_wrapped < -180:
                    cone_ang.append([-180, wrap_to_180(thtp_wrapped)])
                    cone_ang.append([thtm_wrapped + 360, 180])
                elif thtp_wrapped > 180:
                    cone_ang.append([thtm_wrapped, 180])
                    cone_ang.append([-180, wrap_to_180(thtp_wrapped - 360)])
                elif thtm_wrapped > thtp_wrapped:
                    # Collision cone wraps around the -180/180 boundary
                    cone_ang.append([thtm_wrapped, 180])
                    cone_ang.append([-180, thtp_wrapped])
                else:
                    cone_ang.append([thtm_wrapped, thtp_wrapped])

        if np.any(colIdx[i, :]):  # If collision avoidance is needed
            # Control vector angle in world coordinate frame
            thtC = np.degrees(np.arctan2(ctrl[1, i], ctrl[0, i]))

            # Check if control vector is inside any collision cone
            inside_cone = False
            for cone in cone_ang:
                if cone[0] <= thtC <= cone[1]:
                    inside_cone = True
                    break

            if inside_cone:
                # Possible motion directions to test
                angs = np.arange(-180, 185, 5)  # From -180 to 180 inclusive, step 5
                angs_idx = np.ones_like(angs, dtype=bool)  # Start with all True

                # Determine which angles are inside the collision cones
                for idx, r in enumerate(angs):
                    for cone in cone_ang:
                        if cone[0] <= r <= cone[1]:
                            angs_idx[idx] = False
                            break

                angs_feas = angs[angs_idx]  # Feasible directions to take

                # If there is no feasible angle, stop
                if angs_feas.size == 0:
                    stopFlag[i] = True
                else:
                    # Find closest non-colliding control direction
                    tht_diff = np.abs(wrap_to_180(thtC - angs_feas))
                    min_idx = np.argmin(tht_diff)
                    thtCnew = angs_feas[min_idx]

                    # Check if the feasible control direction is within +-90 degrees
                    if np.abs(wrap_to_180(thtCnew - thtC)) >= 90:
                        stopFlag[i] = True

                    # Modify control vector
                    if stopFlag[i]:
                        ctrl[:, i] = np.zeros(2)
                    else:
                        ctrl_norm = np.linalg.norm(ctrl[:, i])
                        ctrl[:, i] = ctrl_norm * np.array([np.cos(np.radians(thtCnew)),
                                                           np.sin(np.radians(thtCnew))])

    # Flatten the control matrix back to a vector in column-major order
    u = ctrl.flatten(order='F')

    return u, n, colIdx, Dc