import numpy as np
import cvxpy as cp

def a_c2r(An):
    """
    Transform a complex matrix to its real block matrix representation.

    Parameters:
    ----------
    An : numpy.ndarray
        A complex matrix of shape (n, n).

    Returns:
    -------
    AnR : numpy.ndarray
        A real matrix of shape (2n, 2n) representing the real and imaginary parts.
    """
    if An.ndim == 2:
        n = An.shape[0]
        AnR = np.zeros((2 * n, 2 * n), dtype=float)
        
        for i in range(n):
            for j in range(n):
                re = np.real(An[i, j])
                im = np.imag(An[i, j])
                AnR[2*i:2*i+2, 2*j:2*j+2] = [[re, -im], [im, re]]
    elif An.ndim == 3:
        numA = An.shape[2]
        n = An.shape[0]
        AnR = np.zeros((2 * n, 2 * n, numA), dtype=float)
        
        for k in range(numA):
            for i in range(n):
                for j in range(n):
                    re = np.real(An[i, j, k])
                    im = np.imag(An[i, j, k])
                    AnR[2*i:2*i+2, 2*j:2*j+2, k] = [[re, -im], [im, re]]
    else:
        raise ValueError("An must be a 2D or 3D complex numpy array.")
    
    return AnR

def find_gains(qsMat, adj):
    """
    SDP design for formation control gain matrix.

    Parameters:
    ----------
    qsMat : numpy.ndarray
        Desired formation coordinates as a 2 x n matrix.
    adj : numpy.ndarray
        Graph adjacency matrix as an n x n boolean (logical) matrix.

    Returns:
    -------
    Ar : numpy.ndarray
        Real representation of the gain matrix as a (2n) x (2n) matrix.
    """
    # Ensure qsMat is a NumPy array
    qsMat = np.array(qsMat)
    adj = np.array(adj, dtype=bool)

    # Transform qsMat to a vector (column-wise flattening)
    qs = qsMat.flatten(order='F')

    # Number of agents
    n = qsMat.shape[1]

    if n <= 2:
        raise ValueError("Number of agents (n) must be greater than 2 to compute orthogonal complement.")

    # Complex representation of desired formation coordinates
    p = qs[0:-1:2]
    q = qs[1::2]
    z = p + 1j * q

    # Stack [z, ones(n,1)] to form an n x 2 complex matrix
    stacked = np.column_stack((z, np.ones(n, dtype=complex)))

    # Perform Singular Value Decomposition (SVD) to find orthogonal complement
    U, S_vals, Vh = np.linalg.svd(stacked, full_matrices=True)

    # Extract the orthogonal complement matrix Q from U
    Q = U[:, 2:n]

    # Subspace constraint matrix S
    S = ~adj  # Logical NOT of adjacency matrix
    np.fill_diagonal(S, False)  # Zero out the diagonal

    # Indices where S is True (non-adjacent pairs)
    S_indices = np.argwhere(S)

    # Define CVXPY variables for Re(A) and Im(A)
    Re_A = cp.Variable((n, n), symmetric=True)
    Im_A = cp.Variable((n, n))

    # Define constraints
    constraints = [
        Im_A == -Im_A.T  # Im(A) is skew-symmetric
    ]

    # Define the vector [z, ones(n,1)]
    ones_vec = np.ones(n)

    # Constraints: A [z, ones(n,1)] == 0 + 0j
    # Which translates to:
    # Re(A) * p - Im(A) * q == 0
    # Im(A) * p + Re(A) * q == 0
    constraints += [
        Re_A @ p - Im_A @ q == 0,
        Im_A @ p + Re_A @ q == 0,
        Re_A @ ones_vec == 0,
        Im_A @ ones_vec == 0
    ]

    # Constraint: Frobenius norm of A <= 10
    constraints += [
        cp.norm(Re_A, 'fro')**2 + cp.norm(Im_A, 'fro')**2 <= 100  # Equivalent to norm(A, 'fro') <= 10
    ]

    # Constraint: A .* S == 0 (element-wise)
    for idx in S_indices:
        i, j = idx
        constraints += [
            Re_A[i, j] == 0,
            Im_A[i, j] == 0
        ]

    # Define the expression Q^* Re(A) Q
    # Since Q is complex, and Re_A is real, Q^* Re(A) Q is real
    Q_conj_transpose = np.conj(Q.T)
    Q_A_Q_real = Q_conj_transpose @ Re_A @ Q

    # Define the objective: maximize the smallest eigenvalue of Q_A_Q_real
    objective = cp.Maximize(cp.lambda_min(Q_A_Q_real))

    # Define and solve the optimization problem
    prob = cp.Problem(objective, constraints)
    prob.solve(solver=cp.SCS, verbose=False)

    if prob.status not in ["optimal", "optimal_inaccurate"]:
        raise ValueError(f"Optimization problem did not solve optimally. Status: {prob.status}")

    # Extract the optimized Re(A) and Im(A)
    Re_A_val = Re_A.value
    Im_A_val = Im_A.value

    # Reconstruct the complex gain matrix A
    A_val = Re_A_val + 1j * Im_A_val

    # Compute Ac = -A
    Ac = -A_val

    # Convert Ac to its real representation
    Ar = a_c2r(Ac)

    return Ar