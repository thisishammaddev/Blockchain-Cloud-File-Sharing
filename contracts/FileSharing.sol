// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FileSharing {
    struct File {
        string ipfsHash; // IPFS hash of the file
        address owner;   // Owner of the file
        mapping(address => bool) access; // Access control
    }

    mapping(uint256 => File) public files;
    uint256 public fileCount = 0;

    event FileUploaded(uint256 fileId, string ipfsHash, address owner);
    event AccessGranted(uint256 indexed fileId, address indexed user);
    event AccessRevoked(uint256 indexed fileId, address indexed user);

    // Upload file metadata
    function uploadFile(string memory _ipfsHash) public {
        require(bytes(_ipfsHash).length > 0, "Empty IPFS hash");
        fileCount++;
        File storage newFile = files[fileCount];
        newFile.ipfsHash = _ipfsHash;
        newFile.owner = msg.sender;
        newFile.access[msg.sender] = true; // Owner has access
        emit FileUploaded(fileCount, _ipfsHash, msg.sender);
    }

    // Grant access to a user
    function grantAccess(uint256 _fileId, address _user) public {
        require(_fileId <= fileCount && _fileId > 0, "File does not exist");
        require(files[_fileId].owner == msg.sender, "Not the owner");
        require(_user != address(0), "Invalid user");
        files[_fileId].access[_user] = true;
        emit AccessGranted(_fileId, _user);
    }

    function revokeAccess(uint256 _fileId, address _user) public {
        require(_fileId <= fileCount && _fileId > 0, "File does not exist");
        require(files[_fileId].owner == msg.sender, "Not the owner");
        require(_user != files[_fileId].owner, "Cannot revoke owner");
        files[_fileId].access[_user] = false;
        emit AccessRevoked(_fileId, _user);
    }

    // Check if a user has access
    function hasAccess(uint256 _fileId, address _user) public view returns (bool) {
        require(_fileId <= fileCount && _fileId > 0, "File does not exist");
        return files[_fileId].access[_user];
    }

    // Get file details
    function getFile(uint256 _fileId) public view returns (string memory ipfsHash, address owner) {
        require(_fileId <= fileCount && _fileId > 0, "File does not exist");
        File storage file = files[_fileId];
        return (file.ipfsHash, file.owner);
    }
}
