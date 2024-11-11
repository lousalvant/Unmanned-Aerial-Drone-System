import numpy as np
from numpy.linalg import eig

from .Helpers.Coefs import coefs_ver3_1_1

def quest_5pt_ver5_2(m, n):
    """
    QuEst (Quaternion Estimation) algorithm for 5 feature points.
    
    Parameters:
    - m, n: Homogeneous coordinates of 5 matched feature points in the first and second frames (3x5 matrices).
    
    Returns:
    - Q: Recovered quaternion solutions.
    """
    
    # Preallocate indices and matrices
    
    Idx = np.array([
        [1, 2, 5, 11, 21, 3, 6, 12, 22, 8, 14, 24, 17, 27, 31, 4, 7, 13, 23, 9, 15, 25, 18, 28, 32, 10, 16, 26, 19, 29, 33, 20, 30, 34, 35],
        [2, 5, 11, 21, 36, 6, 12, 22, 37, 14, 24, 39, 27, 42, 46, 7, 13, 23, 38, 15, 25, 40, 28, 43, 47, 16, 26, 41, 29, 44, 48, 30, 45, 49, 50],
        [3, 6, 12, 22, 37, 8, 14, 24, 39, 17, 27, 42, 31, 46, 51, 9, 15, 25, 40, 18, 28, 43, 32, 47, 52, 19, 29, 44, 33, 48, 53, 34, 49, 54, 55],
        [4, 7, 13, 23, 38, 9, 15, 25, 40, 18, 28, 43, 32, 47, 52, 10, 16, 26, 41, 19, 29, 44, 33, 48, 53, 20, 30, 45, 34, 49, 54, 35, 50, 55, 56]
    ]) - 1  # Subtract 1 for zero-based indexing
    
    # Index of columns of A corresponding to all monomials with at least one power of w
    idx_w = np.arange(0, 35)
    # Index of the rest of the columns (monomials with no power of w)
    idx_w0 = np.arange(35, 56)
    
    # Define Idx1 and Idx2
    Idx1 = np.array([
        [1, 2, 3, 4],
        [2, 5, 6, 7],
        [3, 6, 8, 9],
        [4, 7, 9, 10],
        [5, 11, 12, 13],
        [6, 12, 14, 15],
        [7, 13, 15, 16],
        [8, 14, 17, 18],
        [9, 15, 18, 19],
        [10, 16, 19, 20],
        [11, 21, 22, 23],
        [12, 22, 24, 25],
        [13, 23, 25, 26],
        [14, 24, 27, 28],
        [15, 25, 28, 29],
        [16, 26, 29, 30],
        [17, 27, 31, 32],
        [18, 28, 32, 33],
        [19, 29, 33, 34],
        [20, 30, 34, 35]
    ]) - 1  # Adjust for zero-based indexing
    
    Idx2 = np.array([
        [21, 1, 2, 3],
        [22, 2, 4, 5],
        [23, 3, 5, 6],
        [24, 4, 7, 8],
        [25, 5, 8, 9],
        [26, 6, 9, 10],
        [27, 7, 11, 12],
        [28, 8, 12, 13],
        [29, 9, 13, 14],
        [30, 10, 14, 15],
        [31, 11, 16, 17],
        [32, 12, 17, 18],
        [33, 13, 18, 19],
        [34, 14, 19, 20],
        [35, 15, 20, 21]
    ]) - 1  # Adjust for zero-based indexing
    
    # Initialize Bx matrix
    Bx = np.zeros((35, 35))
    
    # Generate Coefficients matrix (Cf)
    Cf = coefs_ver3_1_1(m, n)
    numEq = Cf.shape[0]
    
    # Create A matrix
    A = np.zeros((4 * numEq, 56))
    for i in range(4):
        idx = Idx[i, :]
        A[i * numEq:(i + 1) * numEq, idx] = Cf
    
    # Split A into matrices A1 and A2 (A1 corresponds to terms with 'w')
    A1 = A[:, idx_w]
    A2 = A[:, idx_w0]
    
    # Solve for Bbar using least-squares
    Bbar = -np.linalg.lstsq(A2, A1, rcond=None)[0]
    
    # Construct Bx matrix using Idx1 and Idx2
    for i in range(20):
        row = Idx1[i, 0]
        col = Idx1[i, 1]
        Bx[row, col] = 1
    
    for i in range(Idx2.shape[0]):
        row = Idx2[i, 0]
        Bx[row, :] = Bbar[Idx2[i, 1], :]
    
    # Eigenvalue decomposition
    eigenvalues, eigenvectors = eig(Bx)
    
    # Use real parts
    V = np.real(eigenvectors)
    
    # Correct the sign of each column so that the first element (w) is always positive
    V = V * np.sign(V[0, :])
    
    # Recover quaternion elements
    w = np.sqrt(np.sqrt(V[0, :]))  # Equivalent to fourth root
    w3 = w ** 3
    x = V[1, :] / w3
    y = V[2, :] / w3
    z = V[3, :] / w3
    
    # Combine quaternion components
    Q = np.vstack([w, x, y, z])
    
    # Normalize quaternions so that each has a norm of 1
    Q_norm = np.linalg.norm(Q, axis=0)
    Q = Q / Q_norm
    
    return Q