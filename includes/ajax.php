<?php
/**
 * Ajax functions
 *
 * @since  1.0.0
 */

// Exit if accessed directly
defined( 'ABSPATH' ) || exit;

/**
 * Fetch all reactions for a given activity
 *
 * This is to avoid overheads in queries. Reactions will only
 * be fetched once the user clicks on the React button.
 *
 * @since  1.0.0
 *
 * @return string a JSON encoded reply.
 */
function bp_activity_reactions_fetch() {
	if ( 'POST' !== strtoupper( $_SERVER['REQUEST_METHOD'] ) ) {
		wp_send_json_error( array(
			'message' => __( 'The action was not sent correctly.', 'bp-reactions' ),
		) );
	}

	$not_allowed = array( 'message' => __( 'You are not allowed to perform this action.', 'bp-reactions' ) );

	// Nonce check
	if ( empty( $_POST['nonce'] ) || ! wp_verify_nonce( $_POST['nonce'], 'bp_reactions_fetch' ) ) {
		wp_send_json_error( $not_allowed );
	}

	//lets check if the activity ids exist to loop through
	if ( ! empty( $_POST['activity_ids'] ) ) {

		$reactions = [];

		//sets the counter for activity ids loop
		$i = 0;

		foreach( $_POST['activity_ids'] as $activity_id ) {

			$reactions_data = bp_reactions_activity_get_users( (int) $activity_id );
			
			//loop through registered reactions
			foreach( (array) bp_reactions_get_reactions() as $key => $reaction  ) {

				//checks if current activity has any type of reactions based off number of user ids
				if( ! empty( $reactions_data[ $reaction->reaction_type ] ) ) {
					$user = in_array( bp_loggedin_user_id(), $reactions_data[$reaction->reaction_type]['users'] );
				} else {
					$user = 0;
				}

				//sets array to be sent back in json
				$records = array(
					'id' => $activity_id,
					'emoji'   => $reaction->emoji
				);

				//if $user is empty then that means the user did not react to the activity yet
				if( ! empty( $user ) ) {
					$records['reacted'] = true;
				} else {
					$records['reacted'] = false;
				}
				
				//calculates how many users reacted to the activity and returns it
				if( ! empty( $user ) && count( $user ) > 0 ) {
					$records['count'] = count( $reactions_data[$reaction->reaction_type]['users'] );
				} else {
					$records['count'] = 0;
				}

				//stores all data in grouped array keys per activity id
				$reactions[$i][$key] = $records;

			}

			//counter for grouping reactions
			$i++;

		}

		wp_send_json_success( $reactions );

	}

	//lets get the reaction if it exists
	if( ! empty( $_POST['activity_id'] ) ) {

		//print_r( (array) bp_reactions_get_reactions() );

		$activity_id = $_POST['activity_id'];	

		$existing = bp_activity_get( array(
			'show_hidden' => true,
			'filter'      => array(
				'user_id'    => bp_loggedin_user_id(),
				'object'     => 'reactions',
				'action'     => '',
				'primary_id' => $activity_id,
			),
		) );

		wp_send_json_success( $existing );

	}

}
add_action( 'wp_ajax_bp_activity_reactions_fetch', 'bp_activity_reactions_fetch' );
add_action( 'wp_ajax_nopriv_bp_activity_reactions_fetch', 'bp_activity_reactions_fetch' );

/**
 * Add or remove a reaction.
 *
 * @since 1.0.0
 *
 * @return string a JSON encoded reply.
 */
function bp_activity_reactions_save() {
	if ( 'POST' !== strtoupper( $_SERVER['REQUEST_METHOD'] ) ) {
		wp_send_json_error( array(
			'message' => __( 'The action was not sent correctly.', 'bp-reactions' ),
		) );
	}

	/*echo "<pre>";
	var_dump( $_POST );
	echo "</pre>";
	die();*/

	$not_allowed = array( 'message' => __( 'You are not allowed to perform this action.', 'bp-reactions' ) );
	$unknown     = array( 'message' => __( 'Oops unknown action.', 'bp-reactions' ) );

	// Nonce check
	if ( empty( $_POST['nonce'] ) || ! wp_verify_nonce( $_POST['nonce'], 'bp_reactions_save' ) ) {
		wp_send_json_error( $not_allowed );
	}

	$react = wp_parse_args( $_POST, array(
		'activity_id' => 0,
		'reaction'    => '',
		'doaction'    => 'add'
	) );


	if ( empty( $react['reaction'] ) || empty( $react['action'] ) || empty( $react['activity_id'] ) ) {
		wp_send_json_error( $unknown );
	}

	//gets reactions if nothing fails at this point
	$reaction = bp_reactions_get_reaction( $react['reaction'] );

	//if the reaction_type is not registered then an unknown error is thrown
	if ( empty( $reaction->reaction_type ) ) {
		wp_send_json_error( $unknown );
	}

	//saves reaction if the action is to add from POST request
	if ( 'add' === $react['doaction'] ) {
		$reacted = bp_activity_reactions_add( $react['activity_id'], array( 'type' => $reaction->reaction_type ) );
	} else {
		$reacted = bp_activity_reactions_remove( $react['activity_id'], $reaction->reaction_name );
	}

	//throws error if $reacted does not return an activity id
	if ( empty( $reacted ) ) {
		wp_send_json_error( array(
			'message' => __( 'Saving the reaction failed.', 'bp-reactions' ),
		) );
	}

	wp_send_json_success( $reacted );
}
add_action( 'wp_ajax_bp_activity_reactions_save', 'bp_activity_reactions_save' );

/**
 * Migrate the BP Favorites to favorite reactions from the
 * BuddyPress tools screen.
 *
 * @since  1.0.0
 *
 * @return string a JSON encoded reply.
 */
function bp_reactions_migrate() {
	$error = array(
		'message'   => __( 'The task could not process due to an error', 'bp-reactions' ),
		'type'      => 'error'
	);

	if ( empty( $_POST['id'] ) || ! isset( $_POST['count'] ) || ! isset( $_POST['done'] ) || ! isset( $_POST['step'] ) ) {
		wp_send_json_error( $error );
	}

	// Add the action to the error
	$callback          = sanitize_key( $_POST['id'] );
	$error['callback'] = $callback;

	// Check nonce
	if ( empty( $_POST['nonce'] ) || ! wp_verify_nonce( $_POST['nonce'], 'bp-reactions-migrate' ) ) {
		wp_send_json_error( $error );
	}

	// Check capability
	if ( ! current_user_can( 'manage_options' ) || ! is_callable( $callback ) ) {
		wp_send_json_error( $error );
	}

	$step   = (int) $_POST['step'];
	$number = 1;
	if ( ! empty( $_POST['number'] ) ) {
		$number = (int) $_POST['number'];
	}

	$did = call_user_func_array( $callback, array( $step, $number ) );
	wp_send_json_success( array( 'done' => $did, 'callback' => $callback ) );
}
add_action( 'wp_ajax_bp_reactions_migrate', 'bp_reactions_migrate' );
