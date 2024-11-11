import numpy as np

def q2r(Q):
    """
    Convert quaternion Q = [q0, q1, q2, q3]^T into the equivalent rotation matrix R.
    
    Parameters:
        Q: 4xN array where each column is a quaternion [q0, q1, q2, q3]^T
    
    Returns:
        R: 3x3xN array of rotation matrices for each input quaternion.
    """
    num_inp = Q.shape[1]
    R = np.zeros((3, 3, num_inp))
    
    for i in range(num_inp):
        q = Q[:, i]

        # If the first quaternion element is negative, negate the quaternion
        if q[0] < 0:
            q = -q

        R[:, :, i] = np.array([
            [1 - 2 * q[2]**2 - 2 * q[3]**2,     2 * q[1] * q[2] - 2 * q[3] * q[0],     2 * q[1] * q[3] + 2 * q[2] * q[0]],
            [2 * q[1] * q[2] + 2 * q[3] * q[0], 1 - 2 * q[1]**2 - 2 * q[3]**2,         2 * q[2] * q[3] - 2 * q[1] * q[0]],
            [2 * q[1] * q[3] - 2 * q[2] * q[0], 2 * q[2] * q[3] + 2 * q[1] * q[0],     1 - 2 * q[1]**2 - 2 * q[2]**2]
        ])
    
    return R

# # Test Cases:
# def main():
#     # 1. Identity Quaternion (no rotation)
#     quaternion1 = np.array([1, 0, 0, 0])

#     # 2. 90-degree rotation around Z-axis
#     quaternion2 = np.array([np.sqrt(2)/2, 0, 0, np.sqrt(2)/2])

#     # 3. 180-degree rotation around Y-axis
#     quaternion3 = np.array([0, 0, 1, 0])

#     # 4. Quaternion with Negative Scalar Part
#     quaternion4 = np.array([-1, 0, 0, 0])

#     # Stack quaternions as columns in a 4x4 array
#     quaternions = np.column_stack((quaternion1, quaternion2, quaternion3, quaternion4))

#     print("Initial Quaternions:\n", quaternions, "\n")

#     # Convert quaternions to rotation matrices
#     R = q2r(quaternions)

#     # 1. Expected Identity Matrix
#     R1_expected = np.eye(3)

#     # 2. Expected 90-degree rotation around Z-axis
#     R2_expected = np.array([
#         [0, -1, 0],
#         [1,  0, 0],
#         [0,  0, 1]
#     ])

#     # 3. Expected 180-degree rotation around Y-axis
#     R3_expected = np.array([
#         [-1,  0,  0],
#         [ 0,  1,  0],
#         [ 0,  0, -1]
#     ])

#     # 4. Expected Quaternion with Negative Scalar Part (should be equivalent to Identity after negation)
#     R4_expected = np.eye(3)

#     # Verify each rotation matrix against the expected matrix
#     tolerance = 1e-10
    
#     print("Identity Quaternion Rotation Matrix:\n", R[:, :, 0], "\n")
#     assert np.allclose(R[:, :, 0], R1_expected, atol=tolerance), "Test 1 Failed: Identity Quaternion"

#     print("90-degree Rotation around Z-axis Rotation Matrix:\n", R[:, :, 1], "\n")
#     assert np.allclose(R[:, :, 1], R2_expected, atol=tolerance), "Test 2 Failed: 90-degree Rotation around Z-axis"

#     print("180-degree Rotation around Y-axis Rotation Matrix:\n", R[:, :, 2], "\n")
#     assert np.allclose(R[:, :, 2], R3_expected, atol=tolerance), "Test 3 Failed: 180-degree Rotation around Y-axis"

#     print("Quaternion with Negative Scalar Part Rotation Matrix:\n", R[:, :, 3], "\n")
#     assert np.allclose(R[:, :, 3], R4_expected, atol=tolerance), "Test 4 Failed: Negative Scalar Part Quaternion"

#     print('All tests passed successfully.')

# if __name__ == '__main__':
#     main()