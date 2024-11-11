import numpy as np

def skew(v):
    """
    Create a skew-symmetric matrix M from a 3D vector v.
    
    Parameters:
        v: 3-element vector (numpy array or list)
    
    Returns:
        M: 3x3 skew-symmetric matrix
    """
    return np.array([
        [0, -v[2], v[1]],
        [v[2], 0, -v[0]],
        [-v[1], v[0], 0]
    ])

# Example usage:
# v = np.array([1, 2, 3])
# M = skew(v)
# print(M)
