import numpy as np

from QuEst.Helpers.Coefs import coefs_ver3_1_1

def quat_residue(m1, m2, qSol):
    """
    Calculate the residue value |C x - c| for estimated quaternion solutions.
    
    Parameters:
        m1: Homogeneous coordinates of feature points in the 1st camera frame (3xN).
        m2: Homogeneous coordinates of feature points in the 2nd camera frame (3xN).
        qSol: Estimated quaternion solutions (4xN).
    
    Returns:
        residu: Residue value for each quaternion solution.
    """
    
    # Coefficinet matrix in the linearized system of multinomials (C * x = c)
    C0 = coefs_ver3_1_1(m1, m2)

    # Quaternion components
    q1 = qSol[0, :]
    q2 = qSol[1, :]
    q3 = qSol[2, :]
    q4 = qSol[3, :]

    # Construct the xVec matrix
    xVec = np.array([
        q1**4,
        q1**3 * q2,
        q1**2 * q2**2,
        q1 * q2**3,
        q2**4,
        q1**3 * q3,
        q1**2 * q2 * q3,
        q1 * q2**2 * q3,
        q2**3 * q3,
        q1**2 * q3**2,
        q1 * q2 * q3**2,
        q2**2 * q3**2,
        q1 * q3**3,
        q2 * q3**3,
        q3**4,
        q1**3 * q4,
        q1**2 * q2 * q4,
        q1 * q2**2 * q4,
        q2**3 * q4,
        q1**2 * q3 * q4,
        q1 * q2 * q3 * q4,
        q2**2 * q3 * q4,
        q1 * q3**2 * q4,
        q2 * q3**2 * q4,
        q3**3 * q4,
        q1**2 * q4**2,
        q1 * q2 * q4**2,
        q2**2 * q4**2,
        q1 * q3 * q4**2,
        q2 * q3 * q4**2,
        q3**2 * q4**2,
        q1 * q4**3,
        q2 * q4**3,
        q3 * q4**3,
        q4**4
    ])

    # Compute residues
    residuMat = np.dot(C0, xVec)

    # Sum the absolute values of the residues
    residu = np.sum(np.abs(residuMat), axis=0)

    return residu
