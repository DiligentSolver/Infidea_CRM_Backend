# Changelog

## [Unreleased]

### Changed

- **Candidate Locking System**: Modified the locking hierarchy to make lineup and walkin records dependent on joinings, removing their self-locking mechanism. Lineups and walkins can now be freely edited unless they're part of an active joining.
  - Removed direct locking of candidates when creating lineup/walkin records
  - Added checks in lineup and walkin controllers to verify if records have active joinings
  - Updated scheduler to no longer directly lock candidates with lineup/walkin status
  - Updated documentation to reflect the new dependency hierarchy
  - Added `editable` flag to candidate records similar to lineups and walkins
  - Prevention of candidate deletion when they have an active joining
