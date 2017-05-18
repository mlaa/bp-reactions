<?php
/**
 * add_action() Hooks
 *
 * @since  1.0.0
 */

// Exit if accessed directly
defined( 'ABSPATH' ) || exit;

//use Illuminate\Support\Helper;

// Register Default reactions (favorites/likes)
add_action( 'bp_init', 'bp_reactions_register_default_reactions', 1 );

// Reactions are specific activities we need to set into the corresponding BuddyPress global
add_action( 'bp_register_activity_actions', 'bp_reactions_register_activity_actions' );

// Update the reactions for an activity when one of its reaction has been deleted or if the parent activity was deleted
add_action( 'bp_activity_after_delete', 'bp_reactions_update_activity_reactions', 10, 1 );

/** Template tag overrides ***************************************************/

/**
 * Add a React button to Activity entries action buttons.
 *
 * @since  1.0.0
 *
 * @return string HTML Output.
 */
function bp_reactions_button() {
	if ( ! bp_reactions_activity_can_react() ) {
		return;
	}

	$count = (int) bp_activity_get_meta( bp_get_activity_id(), 'bp_reactions_count' );

	printf( '<a href="#" class="button react bp-primary-action" title="%1$s" data-bp-activity-id="%2$s">%3$s</a>',
		esc_attr__( 'React', 'bp-reactions' ),
		esc_attr( bp_get_activity_id() ),
		esc_html__( 'React', 'bp-reactions' ) . ' <span>' . $count . '</span>'
	);
}
//add_action( 'bp_activity_entry_meta', 'bp_reactions_button' );

/**
 * Add the container for reactions before activity comments.
 *
 * @since  1.0.0
 *
 * @return string HTML Output.
 */
function bp_reactions_container() {

	//checks if the user is logged in to display reactions
	if( !is_user_logged_in() )
		return;

	$activity_id = bp_get_activity_id();

	echo "<div class='activity-reactions'><ul class='bp_reactions_reactions_list' data-bp-activity-id='{$activity_id}'>";

	$reactions_data = $reactions_data = bp_reactions_activity_get_users( (int) bp_get_activity_id() );

	foreach ( (array) bp_reactions_get_reactions() as $key => $reaction ) {

		//checks reactions_data for reaction type to see if it exists
		if ( ! empty( $reactions_data[ $reaction->reaction_type ] ) ) {
			$users = $reactions_data[ $reaction->reaction_type ]['users'];
		} else {
			$users = 0;
		}

		echo "<li><span><a title='{$reaction->reaction_name}' data-bp-reaction-id='{$reaction->reaction_name}' data-bp-reaction-type='bp_activity_reaction_{$reaction->reaction_name}' data-bp-reaction-hex='{$reaction->emoji}'></a><sub class='count'>";

		//outputs count if theres more than one user that reacted
		if( count( $users ) > 0 ) {
			echo count( $users );
		}

		echo "</sub></span></li>";

	}

	echo "</ul></div>";

}
add_action( 'bp_activity_entry_meta', 'bp_reactions_container' );
//add_action( 'bp_before_activity_entry_comments', 'bp_reactions_container' );

/**
 * Gets all rections for a given activity id
 *  @param  int 	$activity_id 	activity id for reactions
 * @return [type]              [description]
 */
function bp_reactions_get_all_reactions( $activity_id ) {

	//this works in removing reaction activity for a user, find a different way of deleting it
	//bp_activity_delete_for_user_by_component( bp_loggedin_user_id(), 'reactions');


	$reaction_activity = bp_activity_get( array(
		'filter'      => array(
			'user_id'    => bp_loggedin_user_id(),
			'object'     => 'reactions',
			'action'     => '',
			'primary_id' => $activity_id
		),
	) );


	return $reaction_activity['activities'];

}

/**
 * Add a reactions subnav to BuddyPress Diplayed User's Activity nav
 *
 * @since 1.0.0
 */
function bp_reactions_setup_subnav() {
	$slug     = bp_get_activity_slug();
	$position = 30;

	// A unique "Reactions" subnav
	if ( bp_reactions_is_unique_subnav() ) {
		bp_core_new_subnav_item( array(
			'name'            => _x( 'Reactions', 'Displayed member activity reations sub nav', 'bp-reactions' ),
			'slug'            => 'reactions',
			'parent_url'      => trailingslashit( bp_displayed_user_domain() . $slug ),
			'parent_slug'     => $slug,
			'screen_function' => 'bp_activity_screen_my_activity',
			'position'        => 30,
			'item_css_id'     => 'activity-reactions'
		), 'members' );

	// A subnav for each registered reactions.
	} else {

		foreach ( (array) bp_reactions_get_reactions() as $reaction ) {

			if( $reaction->label == 'Favorites' ) {

				bp_core_new_subnav_item( array(
					'name'            => $reaction->label,
					'slug'            => $reaction->reaction_name,
					'parent_url'      => trailingslashit( bp_displayed_user_domain() . $slug ),
					'parent_slug'     => $slug,
					'screen_function' => 'bp_activity_screen_my_activity',
					'position'        => $position,
					'item_css_id'     => 'activity-' . $reaction->reaction_name
				), 'members' );

				$position += 1;

			}
		}

	}
}
add_action( 'bp_activity_setup_nav', 'bp_reactions_setup_subnav' );

/**
 * Add a "Popular" tab to the activity directory to list
 * the activity users reacted ordered by the number of these reactions.
 *
 * @since  1.0.0
 *
 * @return string HTML Output.
 */
function bp_reactions_activity_directory_tab() {
	printf( '<li id="activity-popular"><a href="#" title="%1$s">%2$s</a></li>',
		esc_attr__( 'Popular updates', 'bp-reactions' ),
		esc_html__( 'Popular', 'bp-reactions' )
	);
}
add_action( 'bp_before_activity_type_tab_friends', 'bp_reactions_activity_directory_tab' );
